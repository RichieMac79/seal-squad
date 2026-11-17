// Player, protesters, seals, pucks, power-ups and particles.
(function () {
  const SS = window.SS, C = SS.C;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const BONKS = ['BONK!', 'THWACK!', 'WHAM!', 'POW!', 'FUHGEDDABOUDIT!', 'HEY! I\'M CLUBBIN\' HERE!'];

  // ---------- effects ----------
  SS.burst = function (g, x, y, n, color, speed, life, grav) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(0.3, 1) * speed;
      g.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (grav ? speed * 0.5 : 0), life: rand(0.6, 1) * life, max: life, color, size: rand(2, 4.5), grav: grav || 0 });
    }
  };
  SS.splash = function (g, x, y) {
    SS.burst(g, x, y, 16, '#cfefff', 110, 0.7, 260);
    g.rings.push({ x, y, t: 0 });
    SS.audio.play('splash');
  };
  SS.say = function (g, x, y, text, color, big) {
    g.texts.push({ x, y, text, color: color || '#fff', life: 1.1, big: !!big });
  };

  // ---------- player ----------
  SS.makePlayer = function (f) {
    return { x: f.x, y: f.y, face: { x: 0, y: 1 }, ang: Math.PI / 2, z: 0, jumping: false, jt: 0, jvx: 0, jvy: 0, swingT: 0, swingCd: 0, stun: 0, speedT: 0, coffeeT: 0, pucks: 0, walkT: 0, moving: false };
  };

  function fallIn(g) {
    const p = g.player;
    SS.splash(g, p.x, p.y);
    SS.say(g, p.x, p.y - 30, 'SPLASH!', '#9fe0ff');
    g.combo = 0;
    const f = SS.nearestFloe(g.floes, p.x, p.y);
    p.x = f.x; p.y = f.y; p.z = 0; p.jumping = false; p.stun = 1.1;
  }

  function swing(g) {
    const p = g.player;
    p.swingT = C.SWING_TIME; p.swingCd = C.SWING_CD;
    SS.audio.play('swish');
    for (const pr of g.protesters) {
      if (pr.state === 'bonked') continue;
      const dx = pr.x - p.x, dy = pr.y - p.y, d = Math.hypot(dx, dy);
      if (d > C.SWING_RANGE) continue;
      let da = Math.atan2(dy, dx) - p.ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (d < 22 || Math.abs(da) < C.SWING_ARC) SS.hitProtester(g, pr, d > 1 ? dx / d : p.face.x, d > 1 ? dy / d : p.face.y);
    }
    if (p.pucks > 0) {
      p.pucks--;
      g.pucks.push({ x: p.x + p.face.x * 20, y: p.y + p.face.y * 20, vx: p.face.x * 540, vy: p.face.y * 540, t: 0 });
      SS.audio.play('puck');
    }
  }

  SS.updatePlayer = function (g, dt) {
    const p = g.player, I = SS.input;
    p.swingT = Math.max(0, p.swingT - dt);
    p.swingCd = Math.max(0, p.swingCd - dt);
    p.speedT = Math.max(0, p.speedT - dt);
    p.coffeeT = Math.max(0, p.coffeeT - dt);

    if (p.stun > 0) {
      p.stun -= dt; I.jump = I.swing = false;
      const f = SS.floeAt(g.floes, p.x, p.y, 1.05);
      if (f) { p.x += f.dx; p.y += f.dy; }
      return;
    }

    const a = I.axis();
    p.moving = a.m > 0.1;
    if (p.moving && !p.jumping) {
      const m = Math.hypot(a.x, a.y);
      p.face = { x: a.x / m, y: a.y / m };
      p.ang = Math.atan2(p.face.y, p.face.x);
    }

    if (p.jumping) {
      p.jt += dt;
      p.x = Math.max(18, Math.min(SS.W - 18, p.x + p.jvx * dt));
      p.y = Math.max(C.TOP + 2, Math.min(SS.BOTTOM - 14, p.y + p.jvy * dt));
      p.z = Math.sin(Math.PI * Math.min(1, p.jt / C.JUMP_TIME)) * 30;
      if (p.jt >= C.JUMP_TIME) {
        p.jumping = false; p.z = 0;
        if (!SS.isIce(g, p.x, p.y)) { fallIn(g); return; }
        SS.audio.play('land');
        SS.burst(g, p.x, p.y, 5, '#ffffff', 40, 0.35);
      }
    } else {
      const f = SS.floeAt(g.floes, p.x, p.y);
      if (f) { p.x += f.dx; p.y += f.dy; }
      if (!SS.isIce(g, p.x, p.y)) { fallIn(g); return; }
      if (p.moving) {
        const sp = C.PLAYER_SPEED * (p.speedT > 0 ? 1.55 : 1) * dt;
        const nx = p.x + a.x * sp, ny = p.y + a.y * sp;
        if (SS.isIce(g, nx, ny)) { p.x = nx; p.y = ny; }
        else if (SS.isIce(g, nx, p.y)) p.x = nx;
        else if (SS.isIce(g, p.x, ny)) p.y = ny;
        p.walkT += dt * (p.speedT > 0 ? 16 : 11);
      }
      if (I.take('jump')) {
        const dist = C.JUMP_DIST * (p.coffeeT > 0 ? 1.6 : 1);
        p.jumping = true; p.jt = 0;
        p.jvx = p.face.x * dist / C.JUMP_TIME; p.jvy = p.face.y * dist / C.JUMP_TIME;
        SS.audio.play('jump');
      }
    }
    I.jump = false;
    if (I.take('swing') && p.swingCd <= 0) swing(g);

    for (let i = g.powerups.length - 1; i >= 0; i--) {
      const u = g.powerups[i];
      if (Math.hypot(u.x - p.x, u.y - p.y) < 28 && p.z < 14) {
        g.powerups.splice(i, 1);
        SS.audio.play('pickup');
        if (u.type === 'hotdog') { p.speedT = C.HOTDOG_TIME; SS.say(g, p.x, p.y - 44, 'HOT DOG! SPEED UP', '#ffd166'); }
        if (u.type === 'coffee') { p.coffeeT = C.COFFEE_TIME; SS.say(g, p.x, p.y - 44, 'COFFEE! BIG JUMPS', '#ffd166'); }
        if (u.type === 'puck') { p.pucks = C.PUCKS; SS.say(g, p.x, p.y - 44, 'SLAPSHOTS x' + C.PUCKS, '#ffd166'); }
        if (u.type === 'freeze') { g.freeze = C.FREEZE_TIME; SS.say(g, p.x, p.y - 44, 'DEEP FREEZE!', '#aef'); SS.audio.play('freeze'); }
      }
    }
  };

  // ---------- protesters ----------
  SS.spawnProtester = function (g) {
    const d = g.diff, w = g.wave;
    let x, y;
    const r = Math.random();
    if (r < 0.6) { x = SS.W / 2 + rand(-150, 150); y = 96; }
    else if (r < 0.8) { x = 4; y = rand(170, SS.BOTTOM - 60); }
    else { x = SS.W - 4; y = rand(170, SS.BOTTOM - 60); }
    let type = 'normal';
    const t = Math.random();
    if (w >= 4 && t < 0.2) type = 'banner';
    else if (w >= 3 && t < 0.45) type = 'sprinter';
    const speed = d.speed * (1 + 0.04 * (w - 1)) * (type === 'sprinter' ? 1.6 : type === 'banner' ? 0.85 : 1);
    g.protesters.push({ x, y, type, hp: type === 'banner' ? 2 : 1, hasBanner: type === 'banner', speed, state: 'walk', target: null, sprayT: 0, vx: 0, vy: 0, t: rand(0, 6), spin: 0, stagger: 0, faceX: 1, over: false, ex: 0, ey: 0 });
  };

  function sealFree(s) { return s.state === 'idle' || s.state === 'flee' || s.state === 'return'; }

  function chooseTarget(g, pr) {
    let best = null, bs = 1e9;
    for (const s of g.seals) {
      if (!sealFree(s)) continue;
      let n = 0;
      for (const o of g.protesters) if (o !== pr && o.target === s && o.state !== 'bonked' && o.state !== 'leave') n++;
      const sc = Math.hypot(s.x - pr.x, s.y - pr.y) + n * 220;
      if (sc < bs) { bs = sc; best = s; }
    }
    return best;
  }

  function startLeaving(pr) {
    pr.state = 'leave'; pr.target = null;
    if (pr.y < SS.BOTTOM / 2) { pr.ex = Math.max(SS.W / 2 - 150, Math.min(SS.W / 2 + 150, pr.x)); pr.ey = 84; }
    else { pr.ex = pr.x < SS.W / 2 ? -20 : SS.W + 20; pr.ey = pr.y; }
  }

  SS.hitProtester = function (g, pr, dx, dy) {
    pr.hp--;
    if (pr.hp > 0) {
      pr.hasBanner = false; pr.x += dx * 28; pr.y += dy * 28; pr.stagger = 0.6;
      if (pr.state === 'spray') pr.state = 'walk';
      g.score += 50;
      SS.say(g, pr.x, pr.y - 50, 'CRACK! +50', '#ffe08a');
      SS.burst(g, pr.x, pr.y - 40, 8, '#ffffff', 120, 0.5, 200);
      SS.audio.play('swish'); SS.audio.play('land');
      return;
    }
    pr.state = 'bonked'; pr.vx = dx * 310; pr.vy = dy * 310; pr.t = 0; pr.target = null;
    g.combo++; g.comboT = C.COMBO_TIME; g.bonks++;
    const mult = Math.min(8, g.combo), pts = 100 * mult;
    g.score += pts;
    SS.say(g, pr.x, pr.y - 50, pick(BONKS) + ' +' + pts, mult > 1 ? '#ffd166' : '#fff', mult >= 3);
    SS.burst(g, pr.x, pr.y - 30, 9, '#ffe14d', 150, 0.5, 0);
    g.shake = 0.14;
    SS.audio.play('bonk');
  };

  SS.updateProtesters = function (g, dt) {
    for (let i = g.protesters.length - 1; i >= 0; i--) {
      const pr = g.protesters[i];
      pr.t += dt;
      pr.over = g.freeze <= 0 && pr.y > C.TOP && !SS.floeAt(g.floes, pr.x, pr.y, 1);

      if (pr.state === 'bonked') {
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        pr.vx *= Math.pow(0.12, dt); pr.vy *= Math.pow(0.12, dt);
        pr.spin += dt * 14;
        const out = pr.x < -20 || pr.x > SS.W + 20 || pr.y > SS.H + 20 || pr.y < 60;
        if (out) { g.protesters.splice(i, 1); continue; }
        if (pr.t > 0.3 && pr.over) { SS.splash(g, pr.x, pr.y); g.protesters.splice(i, 1); continue; }
        if (pr.t > 1.3) { SS.burst(g, pr.x, pr.y - 15, 12, '#ffffff', 90, 0.5); g.protesters.splice(i, 1); }
        continue;
      }
      if (pr.stagger > 0) { pr.stagger -= dt; continue; }

      let tx, ty;
      if (pr.state === 'walk') {
        if (!pr.target || !sealFree(pr.target)) pr.target = chooseTarget(g, pr);
        if (!pr.target) { startLeaving(pr); continue; }
        tx = pr.target.x; ty = pr.target.y;
        if (Math.hypot(tx - pr.x, ty - pr.y) < 26) {
          pr.state = 'spray'; pr.sprayT = 0; pr.target.sprayer = pr;
          SS.audio.play('spray');
          continue;
        }
      } else if (pr.state === 'spray') {
        const s = pr.target;
        if (!s || !sealFree(s)) { pr.state = 'walk'; pr.target = null; continue; }
        s.sprayer = pr;
        pr.sprayT += dt;
        s.green = Math.max(s.green, pr.sprayT / g.diff.sprayTime);
        pr.faceX = s.x >= pr.x ? 1 : -1;
        if (Math.random() < dt * 40) {
          const a = Math.atan2(s.y - 8 - (pr.y - 22), s.x - pr.x) + rand(-0.35, 0.35);
          g.particles.push({ x: pr.x + pr.faceX * 12, y: pr.y - 22, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.3, max: 0.3, color: '#4be04b', size: rand(2, 4), grav: 0 });
        }
        if (Math.random() < dt * 4) SS.audio.play('spray');
        if (pr.sprayT >= g.diff.sprayTime) {
          s.state = 'sprayed'; s.green = 1; s.sprayer = null;
          SS.say(g, s.x, s.y - 30, 'SPRAYED!', '#6f6');
          SS.audio.play('bark');
          SS.loseSeal(g);
          startLeaving(pr);
        }
        continue;
      } else { // leave
        tx = pr.ex; ty = pr.ey;
        if (Math.hypot(tx - pr.x, ty - pr.y) < 10) { g.protesters.splice(i, 1); continue; }
      }
      const dx = tx - pr.x, dy = ty - pr.y, d = Math.hypot(dx, dy) || 1;
      const sp = pr.speed * (pr.state === 'leave' ? 1.3 : 1) * (pr.over ? 0.8 : 1);
      pr.x += dx / d * sp * dt; pr.y += dy / d * sp * dt;
      if (Math.abs(dx) > 2) pr.faceX = dx > 0 ? 1 : -1;
    }
  };

  // ---------- seals ----------
  SS.loseSeal = function (g) {
    g.lost++; g.lostFlash = 0.6;
    if (g.lost >= g.diff.maxLost) g.over = true;
  };

  SS.addSeal = function (g) {
    const ok = g.floes.filter(f => !f.fragile && f.state === 'ok' && g.seals.filter(s => s.floe === f).length < (f.centre ? 1 : 2));
    if (!ok.length) return;
    const f = pick(ok), a = rand(0, Math.PI * 2), d = rand(0.1, 0.45) * f.r;
    g.seals.push({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d, floe: f, state: 'idle', dir: { x: 1, y: 0 }, faceX: Math.random() < 0.5 ? -1 : 1, wob: rand(0, 6), green: 0, sprayer: null, born: 0 });
  };

  SS.updateSeals = function (g, dt, calm) {
    const p = g.player;
    if (!calm && g.freeze <= 0) g.fleeT -= dt;
    for (let i = g.seals.length - 1; i >= 0; i--) {
      const s = g.seals[i], f = s.floe;
      s.x += f.dx; s.y += f.dy; s.wob += dt; s.born = Math.min(1, s.born + dt * 2);
      if (s.sprayer && !(s.sprayer.state === 'spray' && s.sprayer.target === s)) s.sprayer = null;
      if (s.state === 'sprayed') continue;
      if (!s.sprayer) s.green = Math.max(0, s.green - dt * 0.5);
      const near = p && p.stun <= 0 && Math.hypot(p.x - s.x, p.y - s.y) < C.HERD_RANGE;

      if (s.state === 'idle') {
        if (calm || s.sprayer) continue;
        // one shared timer, so pups bolt one at a time rather than all at once
        const fleeing = g.seals.filter(o => o.state === 'flee').length;
        if (g.fleeT <= 0 && !near && fleeing < g.diff.maxFlee && Math.random() < 0.2) {
          g.fleeT = rand(g.diff.flee[0], g.diff.flee[1]);
          let dx = s.x - f.x, dy = s.y - f.y; const d = Math.hypot(dx, dy);
          if (d < 6) { const a = rand(0, Math.PI * 2); dx = Math.cos(a); dy = Math.sin(a); } else { dx /= d; dy /= d; }
          s.dir = { x: dx, y: dy }; s.faceX = dx >= 0 ? 1 : -1; s.state = 'flee';
          SS.audio.play('bark');
        }
      } else if (s.state === 'flee') {
        if (near) {
          s.state = 'return';
          SS.say(g, s.x, s.y - 28, 'CALMED +25', '#bff');
          g.score += 25;
          continue;
        }
        if (s.sprayer || g.freeze > 0) continue;
        s.x += s.dir.x * C.SEAL_FLEE_SPEED * dt; s.y += s.dir.y * C.SEAL_FLEE_SPEED * dt;
        if (!SS.onFloe(f, s.x, s.y, 0.99)) {
          SS.splash(g, s.x, s.y);
          SS.say(g, s.x, s.y - 28, 'ESCAPED!', '#f99');
          g.seals.splice(i, 1);
          SS.loseSeal(g);
        }
      } else if (s.state === 'return') {
        const dx = f.x - s.x, dy = f.y - s.y, d = Math.hypot(dx, dy);
        if (d < f.r * 0.35) { s.state = 'idle'; continue; }
        s.x += dx / d * 34 * dt; s.y += dy / d * 34 * dt; s.faceX = dx >= 0 ? 1 : -1;
      }
    }
  };

  // ---------- pucks, power-ups, particles ----------
  SS.updateMisc = function (g, dt) {
    for (let i = g.pucks.length - 1; i >= 0; i--) {
      const k = g.pucks[i];
      k.x += k.vx * dt; k.y += k.vy * dt; k.t += dt;
      let dead = k.t > 1.3 || k.x < 0 || k.x > SS.W || k.y < 80 || k.y > SS.H;
      for (const pr of g.protesters) {
        if (pr.state === 'bonked' || dead) continue;
        if (Math.hypot(pr.x - k.x, pr.y - 14 - k.y) < 22) {
          const m = Math.hypot(k.vx, k.vy);
          SS.hitProtester(g, pr, k.vx / m, k.vy / m); dead = true;
        }
      }
      if (dead) g.pucks.splice(i, 1);
    }

    g.powerT -= dt;
    if (g.powerT <= 0) {
      g.powerT = rand(C.POWER_EVERY[0], C.POWER_EVERY[1]);
      const ok = g.floes.filter(f => f.state === 'ok' && f.stress < 0.3);
      if (ok.length && g.powerups.length < 2) {
        const f = pick(ok), a = rand(0, 6.28), d = rand(0.2, 0.6) * f.r;
        g.powerups.push({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d, floe: f, type: pick(['hotdog', 'puck', 'freeze', 'coffee']), t: 0 });
      }
    }
    for (let i = g.powerups.length - 1; i >= 0; i--) {
      const u = g.powerups[i];
      u.t += dt; u.x += u.floe.dx; u.y += u.floe.dy;
      if (u.t > C.POWER_LIFE || u.floe.state !== 'ok') g.powerups.splice(i, 1);
    }

    for (let i = g.particles.length - 1; i >= 0; i--) {
      const q = g.particles[i];
      q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.life <= 0) g.particles.splice(i, 1);
    }
    for (let i = g.rings.length - 1; i >= 0; i--) { g.rings[i].t += dt; if (g.rings[i].t > 0.7) g.rings.splice(i, 1); }
    for (let i = g.texts.length - 1; i >= 0; i--) {
      const t = g.texts[i]; t.life -= dt; t.y -= 28 * dt;
      if (t.life <= 0) g.texts.splice(i, 1);
    }
  };
})();
