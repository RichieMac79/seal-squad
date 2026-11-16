// Ice floes: generation, drift, cracking and lookup.
(function () {
  const SS = window.SS, C = SS.C;
  const TAU = Math.PI * 2;
  const N = 12; // outline points per floe

  SS.makeFloes = function (diff) {
    const floes = [];
    const cols = 5, rows = 3;
    const x0 = 60, x1 = SS.W - 60, y0 = 130, y1 = SS.H - 40;
    const cw = (x1 - x0) / cols, ch = (y1 - y0) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pts = [];
        for (let i = 0; i < N; i++) pts.push(0.88 + Math.random() * 0.2);
        const hx = x0 + (c + 0.5) * cw + (Math.random() * 20 - 10);
        const hy = y0 + (r + 0.5) * ch + (Math.random() * 14 - 7);
        const centre = c === 2 && r === 1;
        floes.push({
          hx, hy, x: hx, y: hy, dx: 0, dy: 0,
          r: 58 + Math.random() * 12, pts,
          phase: Math.random() * TAU,
          fragile: !centre && Math.random() < diff.fragile,
          stress: 0, state: 'ok', t: 0, scale: 1, centre
        });
      }
    }
    return floes;
  };

  SS.floeRadiusAt = function (f, ang) {
    let a = ((ang % TAU) + TAU) % TAU / TAU * N;
    const i = Math.floor(a) % N, fr = a - Math.floor(a);
    return f.r * (f.pts[i] * (1 - fr) + f.pts[(i + 1) % N] * fr);
  };

  SS.onFloe = function (f, x, y, margin) {
    if (f.state !== 'ok') return false;
    const dx = x - f.x, dy = y - f.y;
    const d = Math.hypot(dx, dy);
    if (d > f.r * 1.1) return false;
    return d <= SS.floeRadiusAt(f, Math.atan2(dy, dx)) * (margin || 0.93);
  };

  SS.floeAt = function (floes, x, y, margin) {
    for (const f of floes) if (SS.onFloe(f, x, y, margin)) return f;
    return null;
  };

  SS.nearestFloe = function (floes, x, y) {
    let best = null, bd = 1e9;
    for (const f of floes) {
      if (f.state !== 'ok' || f.stress > 0.5) continue;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < bd) { bd = d; best = f; }
    }
    return best || floes.find(f => f.centre);
  };

  SS.updateFloes = function (g, dt) {
    const p = g.player;
    const under = p && !p.jumping && p.stun <= 0 && g.freeze <= 0 ? SS.floeAt(g.floes, p.x, p.y) : null;
    for (const f of g.floes) {
      const nx = f.hx + Math.sin(g.time * 0.3 + f.phase) * 6;
      const ny = f.hy + Math.cos(g.time * 0.25 + f.phase) * 4;
      f.dx = nx - f.x; f.dy = ny - f.y; f.x = nx; f.y = ny;

      if (!f.fragile) continue;
      if (f.state === 'ok') {
        f.scale = Math.min(1, f.scale + dt * 2);
        if (f === under) {
          const before = f.stress;
          f.stress += dt / C.CRACK_TIME;
          if (before < 0.5 && f.stress >= 0.5) SS.audio.play('crack');
          if (f.stress >= 1) { f.state = 'sinking'; f.t = 0; SS.audio.play('crack'); }
        } else {
          f.stress = Math.max(0, f.stress - dt * 0.4);
        }
      } else if (f.state === 'sinking') {
        f.t += dt; f.scale = Math.max(0, 1 - f.t / 0.6);
        if (f.t >= 0.6) { f.state = 'sunk'; f.t = 0; }
      } else if (f.state === 'sunk') {
        f.t += dt;
        if (f.t >= C.SUNK_TIME) { f.state = 'ok'; f.stress = 0; f.scale = 0.2; }
      }
    }
  };

  // Walkable ground test (the whole bay counts while the water is frozen).
  SS.isIce = function (g, x, y) {
    if (x < 16 || x > SS.W - 16 || y < C.TOP || y > SS.H - 12) return false;
    if (g.freeze > 0) return true;
    return !!SS.floeAt(g.floes, x, y);
  };
})();
