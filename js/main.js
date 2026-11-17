// Game state, waves and the main loop.
(function () {
  const SS = window.SS, C = SS.C;
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const STEP = 1 / 60;
  let g = null, mode = 'menu', diffKey = 'medium', last = 0, acc = 0;

  // Choose the world shape for the current viewport (only between games, never mid-game).
  function relayout() {
    let reserve = 0;
    if (document.body.classList.contains('touch')) {
      const top = $('stick').getBoundingClientRect().top;
      if (top > 0) reserve = window.innerHeight - top + 8;
    }
    return SS.layout(window.innerWidth, window.innerHeight, reserve);
  }
  // Scale the canvas to fill as much of the viewport as the world's shape allows.
  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const full = SS.H + SS.TOPBAR;
    const scale = Math.min(window.innerWidth / SS.W, window.innerHeight / full);
    canvas.style.width = SS.W * scale + 'px'; canvas.style.height = full * scale + 'px';
    canvas.width = Math.round(SS.W * scale * dpr); canvas.height = Math.round(full * scale * dpr);
    const k = canvas.width / SS.W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
  }
  function resize() {
    if (mode === 'menu' && relayout()) g = newGame('medium');
    fit();
  }

  function best(k) { try { return +localStorage.getItem('sealsquad-best-' + k) || 0; } catch (e) { return 0; } }
  function saveBest(k, v) { try { localStorage.setItem('sealsquad-best-' + k, v); } catch (e) { /* ignore */ } }
  function showBests() { for (const k in SS.DIFF) $('best-' + k).textContent = best(k) ? 'Best ' + best(k) : ''; }

  function newGame(key) {
    const diff = SS.DIFF[key];
    const floes = SS.makeFloes(diff);
    const s = {
      diff, key, floes, time: 0, score: 0, combo: 0, comboT: 0, bonks: 0, lost: 0, lostFlash: 0, over: false,
      wave: 0, toSpawn: 0, spawnT: 0, intermission: 1.6, freeze: 0, shake: 0, powerT: 9, fleeT: diff.flee[1],
      banner: 0, bannerText: '', bannerSub: '',
      seals: [], protesters: [], pucks: [], powerups: [], particles: [], rings: [], texts: []
    };
    s.player = SS.makePlayer(floes.find(f => f.centre));
    for (let i = 0; i < C.SEALS; i++) SS.addSeal(s);
    for (const q of s.seals) q.born = 1;
    return s;
  }

  function startWave() {
    g.wave++;
    g.toSpawn = Math.round(g.diff.count0 + (g.wave - 1) * g.diff.ramp);
    g.spawnT = 1.2;
    g.seals = g.seals.filter(s => s.state !== 'sprayed');
    while (g.seals.length < C.SEALS) SS.addSeal(g);
    g.banner = 2.4; g.bannerText = 'WAVE ' + g.wave;
    g.bannerSub = g.wave === 1 ? 'Protect the pups!' : g.wave === 3 ? 'Sprinters incoming!' : g.wave === 4 ? 'Banner carriers take two hits!' : '';
    SS.audio.play('wave');
  }

  function update(dt) {
    g.time += dt;
    g.freeze = Math.max(0, g.freeze - dt);
    g.shake = Math.max(0, g.shake - dt);
    g.lostFlash = Math.max(0, g.lostFlash - dt);
    g.banner = Math.max(0, g.banner - dt);
    if (g.comboT > 0) { g.comboT -= dt; if (g.comboT <= 0) g.combo = 0; }

    SS.updateFloes(g, dt);
    SS.updatePlayer(g, dt);
    SS.updateProtesters(g, dt);
    SS.updateSeals(g, dt, false);
    SS.updateMisc(g, dt);

    if (g.intermission > 0) {
      g.intermission -= dt;
      if (g.intermission <= 0) startWave();
    } else {
      g.spawnT -= dt;
      if (g.toSpawn > 0 && g.spawnT <= 0) {
        SS.spawnProtester(g); g.toSpawn--;
        g.spawnT = g.diff.interval * (0.7 + Math.random() * 0.6) * Math.max(0.5, 1 - 0.04 * g.wave);
      }
      if (g.toSpawn === 0 && g.protesters.length === 0) {
        const safe = g.seals.filter(s => s.state !== 'sprayed').length, bonus = safe * 50;
        g.score += bonus;
        g.banner = 2.4; g.bannerText = 'WAVE CLEAR'; g.bannerSub = safe + ' pups safe  +' + bonus;
        g.intermission = 3;
      }
    }
    if (g.over) gameOver();
  }

  function gameOver() {
    mode = 'over';
    SS.audio.play('over');
    const prev = best(g.key), isBest = g.score > prev;
    if (isBest) saveBest(g.key, g.score);
    $('overMsg').textContent = 'Too many pups got sprayed or slipped away.';
    $('overScore').textContent = g.score;
    $('overStats').textContent = `${g.diff.label} · wave ${g.wave} · ${g.bonks} bonks · ` + (isBest ? 'NEW BEST!' : 'best ' + prev);
    $('over').classList.remove('hidden');
  }

  function play(key) {
    diffKey = key; relayout(); g = newGame(key); fit(); mode = 'play'; acc = 0;
    SS.input.jump = SS.input.swing = false;
    for (const id of ['menu', 'over', 'paused']) $(id).classList.add('hidden');
    SS.audio.init();
  }
  function toMenu() {
    mode = 'menu'; relayout(); g = newGame('medium'); fit(); showBests();
    $('menu').classList.remove('hidden'); $('over').classList.add('hidden'); $('paused').classList.add('hidden');
  }
  function togglePause() {
    if (mode === 'play') { mode = 'paused'; $('paused').classList.remove('hidden'); }
    else if (mode === 'paused') { mode = 'play'; $('paused').classList.add('hidden'); }
  }
  function toggleMute() { $('btnMute').classList.toggle('off', SS.audio.toggle()); }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
    if (mode === 'play') {
      acc += dt;
      while (acc >= STEP && mode === 'play') { update(STEP); acc -= STEP; }
    } else if (mode === 'menu') {
      g.time += dt; SS.updateFloes(g, dt); SS.updateSeals(g, dt, true);
    }
    SS.render(ctx, g, mode !== 'menu');
    requestAnimationFrame(frame);
  }

  function drawHero() {
    const h = $('hero'), c = h.getContext('2d');
    c.clearRect(0, 0, h.width, h.height);
    SS.drawPlayer(c, 62, 158, 2.9, { face: { x: 0.6, y: 0.8 }, ang: 0.2, z: 0, swingT: 0, stun: 0, walkT: 0, moving: false, jumping: false }, 0);
  }

  // wiring
  document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => play(b.dataset.diff)));
  $('btnAgain').addEventListener('click', () => play(diffKey));
  $('btnMenu').addEventListener('click', toMenu);
  $('btnQuit').addEventListener('click', toMenu);
  $('btnResume').addEventListener('click', togglePause);
  $('btnPause').addEventListener('click', togglePause);
  $('btnMute').addEventListener('click', toggleMute);
  SS.input.onPause = togglePause;
  SS.input.onMute = toggleMute;
  SS.input.onAny = () => SS.audio.init();
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') togglePause(); });
  window.addEventListener('resize', resize);

  SS.setupPointer(canvas);
  drawHero(); toMenu();
  SS.debug = { get g() { return g; }, get mode() { return mode; }, update, play };
  requestAnimationFrame(frame);
})();
