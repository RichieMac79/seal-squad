// All drawing: water, floes, ship, characters, effects and HUD.
(function () {
  const SS = window.SS, C = SS.C;
  const TAU = Math.PI * 2;
  const BLUE = '#0038a8', RED = '#c8102e', SKIN = '#f0c39e';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function ell(ctx, x, y, a, b) { ctx.beginPath(); ctx.ellipse(x, y, a, b, 0, 0, TAU); }
  function shadow(ctx, x, y, w, alpha) { ctx.fillStyle = `rgba(20,50,80,${alpha || 0.25})`; ell(ctx, x, y, w, w * 0.4); ctx.fill(); }

  const snow = [];
  for (let i = 0; i < 70; i++) snow.push({ x: Math.random() * SS.W, y: Math.random() * SS.H, s: 0.6 + Math.random() * 1.8, v: 20 + Math.random() * 40, p: Math.random() * 6 });

  // ---------- scenery ----------
  function drawWater(ctx, g) {
    const gr = ctx.createLinearGradient(0, 0, 0, SS.H);
    gr.addColorStop(0, '#0d3556'); gr.addColorStop(1, '#0a2238');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, SS.W, SS.H);
    // faint aurora shimmer
    const a = 0.05 + 0.04 * Math.sin(g.time * 0.4);
    const au = ctx.createLinearGradient(0, 0, SS.W, 0);
    au.addColorStop(0, `rgba(80,255,170,0)`); au.addColorStop(0.5 + 0.3 * Math.sin(g.time * 0.15), `rgba(80,255,170,${a})`); au.addColorStop(1, `rgba(120,160,255,0)`);
    ctx.fillStyle = au; ctx.fillRect(0, 0, SS.W, 120);
    ctx.strokeStyle = 'rgba(160,210,240,0.16)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const x = (i * 137.5) % SS.W, y = 100 + (i * 71.3) % (SS.H - 100);
      const o = Math.sin(g.time * 0.8 + i) * 8;
      ctx.beginPath(); ctx.moveTo(x + o, y); ctx.quadraticCurveTo(x + o + 9, y - 4, x + o + 18, y); ctx.stroke();
    }
    if (g.freeze > 0) {
      const fa = g.freeze < 1.5 ? (Math.sin(g.time * 22) > 0 ? 0.5 : 0.15) : 0.55;
      ctx.fillStyle = `rgba(190,230,250,${fa})`;
      ctx.fillRect(0, C.TOP - 6, SS.W, SS.H);
    }
  }

  function drawShip(ctx, g) {
    const x = SS.W / 2, y = 78;
    // pack ice around the hull
    ctx.fillStyle = '#b9d9ea'; ell(ctx, x, y + 14, 250, 20); ctx.fill();
    ctx.fillStyle = '#eef7fc'; ell(ctx, x, y + 8, 240, 18); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.03);
    // hull
    ctx.fillStyle = '#1d5b3a';
    ctx.beginPath(); ctx.moveTo(-150, -34); ctx.lineTo(160, -34); ctx.lineTo(190, -46); ctx.lineTo(168, 4); ctx.lineTo(-136, 4); ctx.closePath(); ctx.fill();
    const cols = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
    cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(96 + i * 0, -30 + i * 3, 60, 3); });
    ctx.fillStyle = '#143f29'; ctx.fillRect(-136, -4, 304, 8);
    // cabin, funnel, mast
    ctx.fillStyle = '#f4f1e6'; rr(ctx, -70, -62, 110, 30, 4); ctx.fill();
    ctx.fillStyle = '#26465a'; for (let i = 0; i < 6; i++) ctx.fillRect(-62 + i * 17, -54, 10, 9);
    ctx.fillStyle = '#f4f1e6'; rr(ctx, -40, -76, 50, 16, 3); ctx.fill();
    ctx.fillStyle = '#d7a31a'; ctx.fillRect(-98, -72, 18, 40);
    ctx.fillStyle = '#222'; ctx.fillRect(-98, -76, 18, 6);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(90, -34); ctx.lineTo(90, -78); ctx.stroke();
    // smoke
    ctx.fillStyle = 'rgba(220,230,240,0.35)';
    for (let i = 0; i < 4; i++) { const t = (g.time * 0.4 + i * 0.25) % 1; ell(ctx, -89 - t * 30, -80 - t * 26, 5 + t * 9, 4 + t * 7); ctx.fill(); }
    ctx.restore();
  }

  function floePath(ctx, f, sc, oy) {
    const n = f.pts.length, P = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, r = f.r * f.pts[i] * sc; P.push([f.x + Math.cos(a) * r, f.y + oy + Math.sin(a) * r]); }
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = P[i % n], q = P[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p[0], p[1], mx, my);
    }
    ctx.closePath();
  }

  function drawFloe(ctx, f, g) {
    if (f.state === 'sunk') {
      ctx.fillStyle = 'rgba(160,210,240,0.10)'; ell(ctx, f.x, f.y, f.r * 0.7, f.r * 0.6); ctx.fill();
      return;
    }
    const sc = f.scale;
    const jx = f.stress > 0.5 ? Math.sin(g.time * 50) * 1.5 : 0;
    ctx.save(); ctx.translate(jx, 0);
    ctx.fillStyle = '#7fb2d2'; floePath(ctx, f, sc, 9); ctx.fill();
    ctx.fillStyle = f.fragile ? '#d3e8f5' : '#f1f9fd'; floePath(ctx, f, sc, 0); ctx.fill();
    ctx.strokeStyle = f.fragile ? '#a9cfe6' : '#d3e7f2'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(190,220,238,0.5)';
    ell(ctx, f.x - f.r * 0.3 * sc, f.y + f.r * 0.25 * sc, f.r * 0.22 * sc, f.r * 0.1 * sc); ctx.fill();
    ell(ctx, f.x + f.r * 0.35 * sc, f.y - f.r * 0.3 * sc, f.r * 0.16 * sc, f.r * 0.07 * sc); ctx.fill();
    if (f.fragile) {
      ctx.strokeStyle = `rgba(60,110,150,${0.35 + f.stress * 0.6})`; ctx.lineWidth = 1.5 + f.stress * 1.5;
      const k = Math.floor(f.phase * 10) % 3;
      for (let i = 0; i < 3 + Math.floor(f.stress * 4); i++) {
        const a = f.phase + i * 2.1 + k, r = f.r * sc * (0.25 + 0.5 * ((i * 37) % 10) / 10);
        ctx.beginPath(); ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x + Math.cos(a) * r * 0.5 + 5, f.y + Math.sin(a) * r * 0.5 - 4);
        ctx.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------- characters ----------
  function drawStick(ctx, ang, r0, r1) {
    const c = Math.cos(ang), s = Math.sin(ang);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 4.2;
    ctx.beginPath(); ctx.moveTo(c * r0, -16 + s * r0 * 0.8); ctx.lineTo(c * r1, -8 + s * r1 * 0.8); ctx.stroke();
    ctx.strokeStyle = '#c9965a'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(c * r0, -16 + s * r0 * 0.8); ctx.lineTo(c * r1, -8 + s * r1 * 0.8); ctx.stroke();
    // blade
    const bx = c * r1, by = -8 + s * r1 * 0.8, pa = ang + 1.2;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(pa) * 10, by + Math.sin(pa) * 8); ctx.stroke();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(bx + Math.cos(pa) * 4, by + Math.sin(pa) * 3.2); ctx.lineTo(bx + Math.cos(pa) * 8, by + Math.sin(pa) * 6.4); ctx.stroke();
  }

  // The hero: sleeveless blue hockey vest with diagonal NEW YORK lettering.
  SS.drawPlayer = function (ctx, x, y, s, p, time) {
    const fx = p.face.x < -0.2 ? -1 : p.face.x > 0.2 ? 1 : 0;
    const up = p.face.y < -0.5;
    shadow(ctx, x, y, 13 * s * (1 - p.z / 90), 0.28);
    ctx.save();
    ctx.translate(x, y - p.z * s); ctx.scale(s, s);
    if (p.stun > 0) { ctx.translate(Math.sin(time * 60) * 1.5, 0); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 25); }
    const sw = p.swingT > 0 ? 1 - p.swingT / C.SWING_TIME : -1;
    const stickAng = sw >= 0 ? p.ang - 1.3 + 2.6 * sw : p.ang + 0.75;
    const behind = Math.sin(stickAng) < -0.2;
    if (sw >= 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(0, -10, 44, 35, 0, p.ang - 1.3, stickAng); ctx.stroke();
    }
    if (behind) drawStick(ctx, stickAng, 8, 44);
    // legs
    const lg = p.moving && !p.jumping ? Math.sin(p.walkT) * 3 : 0;
    ctx.fillStyle = '#1b2433';
    rr(ctx, -8, -12 + Math.max(0, lg), 6.5, 12 - Math.max(0, lg), 2); ctx.fill();
    rr(ctx, 1.5, -12 + Math.max(0, -lg), 6.5, 12 - Math.max(0, -lg), 2); ctx.fill();
    ctx.fillStyle = '#111'; rr(ctx, -9, -3, 8, 3.5, 1.5); ctx.fill(); rr(ctx, 1, -3, 8, 3.5, 1.5); ctx.fill();
    // bare arms
    ctx.fillStyle = SKIN;
    rr(ctx, -15.5, -30, 5.5, 14, 2.5); ctx.fill(); rr(ctx, 10, -30, 5.5, 14, 2.5); ctx.fill();
    // vest
    ctx.fillStyle = BLUE; rr(ctx, -11.5, -33, 23, 23, 4); ctx.fill();
    ctx.save(); rr(ctx, -11.5, -33, 23, 23, 4); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(-12, -15.5, 24, 1.6);
    ctx.fillStyle = RED; ctx.fillRect(-12, -13.6, 24, 2.2);
    ctx.fillStyle = '#fff'; ctx.fillRect(-12, -11.2, 24, 1.2);
    ctx.fillStyle = RED; ctx.fillRect(-12, -33, 3, 5); ctx.fillRect(9, -33, 3, 5);
    if (!up) {
      ctx.translate(0, -23); ctx.rotate(0.52);
      ctx.font = '900 5px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 1.4; ctx.strokeStyle = '#fff'; ctx.strokeText('NEW YORK', 0, 0);
      ctx.fillStyle = RED; ctx.fillText('NEW YORK', 0, 0);
    } else {
      ctx.font = '900 10px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff'; ctx.strokeText('82', 0, -23);
      ctx.fillStyle = RED; ctx.fillText('82', 0, -23);
    }
    ctx.restore();
    // head
    ctx.fillStyle = SKIN; ell(ctx, 0, -40, 7.5, 7.5); ctx.fill();
    ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(0, -41.5, 8, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = RED; ctx.fillRect(-8, -42.5, 16, 2);
    ctx.fillStyle = '#fff'; ell(ctx, 0, -50, 2.2, 2.2); ctx.fill();
    if (!up) {
      ctx.fillStyle = 'rgba(70,50,40,0.35)'; ctx.beginPath(); ctx.arc(fx * 1.5, -38.5, 5.6, 0.1, Math.PI - 0.1); ctx.fill();
      ctx.fillStyle = '#111'; ell(ctx, -2.6 + fx * 2, -39.5, 1, 1.2); ctx.fill(); ell(ctx, 2.6 + fx * 2, -39.5, 1, 1.2); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-2 + fx * 2, -35.8); ctx.lineTo(2.4 + fx * 2, -36.4); ctx.stroke();
    }
    if (!behind) drawStick(ctx, stickAng, 8, 44);
    ctx.restore();
  };

  function drawProtester(ctx, pr, g) {
    const hop = pr.over && pr.state !== 'bonked' ? Math.abs(Math.sin(pr.t * 9)) * 9 : 0;
    const col = pr.type === 'sprinter' ? ['#e2b21c', '#b98c0c'] : pr.type === 'banner' ? ['#2a9d8f', '#1d7168'] : ['#2f9e44', '#237032'];
    shadow(ctx, pr.x, pr.y, 12, 0.25);
    ctx.save(); ctx.translate(pr.x, pr.y - hop); ctx.scale(1.2, 1.2);
    if (pr.state === 'bonked') { ctx.translate(0, -18); ctx.rotate(pr.spin); ctx.translate(0, 18); }
    if (pr.stagger > 0) ctx.rotate(Math.sin(pr.t * 30) * 0.15);
    const fx = pr.faceX, lg = pr.state === 'walk' || pr.state === 'leave' ? Math.sin(pr.t * 10) * 3 : 0;
    ctx.fillStyle = '#39424e';
    rr(ctx, -7, -11 + Math.max(0, lg), 6, 11 - Math.max(0, lg), 2); ctx.fill();
    rr(ctx, 1, -11 + Math.max(0, -lg), 6, 11 - Math.max(0, -lg), 2); ctx.fill();
    ctx.fillStyle = col[0]; rr(ctx, -11, -32, 22, 23, 6); ctx.fill();
    ctx.fillStyle = col[1]; ctx.fillRect(-1, -30, 2, 20);
    // hood + face
    ctx.fillStyle = col[1]; ell(ctx, 0, -38, 9, 9); ctx.fill();
    ctx.fillStyle = '#e9dcc4'; ell(ctx, 0, -38, 9, 9); ctx.lineWidth = 2; ctx.strokeStyle = '#e9dcc4'; ctx.stroke();
    ctx.fillStyle = col[1]; ell(ctx, 0, -38, 8, 8); ctx.fill();
    ctx.fillStyle = '#f3cfae'; ell(ctx, fx * 1.5, -37.5, 5.5, 5.5); ctx.fill();
    ctx.fillStyle = '#111';
    if (pr.state === 'bonked') {
      ctx.font = 'bold 5px Arial'; ctx.textAlign = 'center'; ctx.fillText('x x', fx * 1.5, -36.5);
    } else {
      ell(ctx, fx * 1.5 - 2, -38.5, 0.9, 1); ctx.fill(); ell(ctx, fx * 1.5 + 2, -38.5, 0.9, 1); ctx.fill();
    }
    // spray can
    if (pr.state !== 'bonked') {
      const cx = fx * (pr.state === 'spray' ? 14 : 11), cy = pr.state === 'spray' ? -26 : -20;
      ctx.fillStyle = col[0]; rr(ctx, fx > 0 ? 7 : cx - 1, cy + 2, Math.abs(cx) - 5, 5, 2); ctx.fill();
      ctx.fillStyle = '#cfd6dc'; rr(ctx, cx - 3, cy - 4, 6, 10, 1.5); ctx.fill();
      ctx.fillStyle = '#3ddc3d'; ctx.fillRect(cx - 3, cy - 1, 6, 3);
      ctx.fillStyle = '#222'; ctx.fillRect(cx - 1.5, cy - 6.5, 3, 2.5);
    }
    if (pr.hasBanner) {
      ctx.strokeStyle = '#7a5a36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-fx * 9, -22); ctx.lineTo(-fx * 9, -62); ctx.stroke();
      ctx.fillStyle = '#fff'; rr(ctx, -fx * 9 - 17, -76, 34, 18, 2); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#1b7a35'; ctx.font = 'bold 6px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('SAVE THE', -fx * 9, -70.5); ctx.fillText('SEALS', -fx * 9, -63.5);
    }
    ctx.restore();
    if (pr.state === 'bonked') {
      ctx.fillStyle = '#ffe14d'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) { const a = pr.t * 9 + i * 2.1; ctx.fillText('★', pr.x + Math.cos(a) * 15, pr.y - 46 + Math.sin(a) * 5); }
    }
    if (pr.state === 'spray') {
      const w = 30, k = Math.min(1, pr.sprayT / g.diff.sprayTime);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(pr.x - w / 2, pr.y - 58, w, 5);
      ctx.fillStyle = '#4be04b'; ctx.fillRect(pr.x - w / 2, pr.y - 58, w * k, 5);
    }
  }

  function mix(a, b, t) { return Math.round(a + (b - a) * t); }
  function drawSeal(ctx, s, g) {
    const t = s.green, body = `rgb(${mix(250, 96, t)},${mix(252, 214, t)},${mix(255, 96, t)})`, shade = `rgb(${mix(214, 60, t)},${mix(226, 170, t)},${mix(236, 70, t)})`;
    shadow(ctx, s.x, s.y + 2, 15, 0.22);
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.faceX * s.born * 1.2, s.born * 1.2);
    if (s.state === 'flee') ctx.rotate(Math.sin(s.wob * 14) * 0.16);
    else ctx.translate(0, Math.sin(s.wob * 2) * 0.6);
    // tail flippers
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.moveTo(-13, -5); ctx.lineTo(-22, -11); ctx.lineTo(-19, -4); ctx.lineTo(-22, 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(70,110,140,0.75)'; ctx.lineWidth = 1.2;
    ctx.fillStyle = body; ell(ctx, -2, -6, 14, 8.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade; ell(ctx, 1, -1, 5, 2.5); ctx.fill();
    ctx.fillStyle = body; ell(ctx, 11, -11, 7.5, 7); ctx.fill(); ctx.stroke();
    ell(ctx, 4, -7.5, 6, 5); ctx.fill();
    ctx.fillStyle = '#111'; ell(ctx, 9.5, -12.5, 1.5, 1.8); ctx.fill(); ell(ctx, 15, -12.5, 1.5, 1.8); ctx.fill();
    ell(ctx, 13.5, -9, 1.6, 1.1); ctx.fill();
    ctx.strokeStyle = 'rgba(40,40,40,0.5)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(15, -8.5); ctx.lineTo(20, -9.5); ctx.moveTo(15, -8); ctx.lineTo(20, -7); ctx.stroke();
    if (s.state === 'sprayed') { ctx.strokeStyle = '#111'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(13, -5.2, 2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    ctx.restore();
    if (s.state === 'flee') {
      ctx.fillStyle = '#ff5b5b'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
      ctx.fillText('!', s.x, s.y - 26 - Math.abs(Math.sin(s.wob * 6)) * 4);
    }
  }

  function drawPower(ctx, u, g) {
    if (u.t > C.POWER_LIFE - 2.5 && Math.sin(u.t * 20) > 0) return;
    const y = u.y - 8 - Math.abs(Math.sin(u.t * 3)) * 5;
    shadow(ctx, u.x, u.y, 10, 0.2);
    ctx.strokeStyle = `rgba(255,220,90,${0.5 + 0.3 * Math.sin(u.t * 6)})`; ctx.lineWidth = 2; ell(ctx, u.x, y, 15, 15); ctx.stroke();
    ctx.save(); ctx.translate(u.x, y);
    if (u.type === 'hotdog') {
      ctx.fillStyle = '#e2b25c'; rr(ctx, -11, -5, 22, 10, 5); ctx.fill();
      ctx.fillStyle = '#b5372b'; rr(ctx, -12.5, -2.5, 25, 5, 2.5); ctx.fill();
      ctx.strokeStyle = '#f5d21f'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-9, 0);
      for (let i = 0; i < 6; i++) ctx.lineTo(-9 + (i + 1) * 3, i % 2 ? 1.3 : -1.3); ctx.stroke();
    } else if (u.type === 'puck') {
      ctx.fillStyle = '#000'; ell(ctx, 0, 3, 10, 5); ctx.fill(); ctx.fillRect(-10, -2, 20, 5);
      ctx.fillStyle = '#333'; ell(ctx, 0, -2, 10, 5); ctx.fill();
    } else if (u.type === 'freeze') {
      ctx.strokeStyle = '#bff0ff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(-Math.cos(a) * 10, -Math.sin(a) * 10); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(7, -8); ctx.lineTo(5, 9); ctx.lineTo(-5, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = BLUE; ctx.fillRect(-6.5, -3, 13, 6);
      ctx.fillStyle = '#6b4226'; ctx.fillRect(-8, -10, 16, 3);
    }
    ctx.restore();
  }

  // ---------- HUD ----------
  function label(ctx, text, x, y, size, color, align) {
    ctx.font = `bold ${size}px "Trebuchet MS", Arial, sans-serif`; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(4,20,36,0.85)'; ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  function drawHUD(ctx, g) {
    const p = g.player;
    label(ctx, 'SCORE ' + g.score, 14, 30, 22, '#fff');
    if (g.combo > 1) label(ctx, 'COMBO x' + Math.min(8, g.combo), 14, 54, 17, '#ffd166');
    label(ctx, 'WAVE ' + Math.max(1, g.wave), SS.W - 14, 30, 22, '#fff', 'right');
    // seals-lost meter
    const n = g.diff.maxLost;
    label(ctx, 'SEALS LOST', SS.W - 14 - n * 20 - 6, 54, 12, g.lostFlash > 0 ? '#ff7b7b' : '#b9dcf2', 'right');
    for (let i = 0; i < n; i++) {
      const x = SS.W - 24 - (n - 1 - i) * 20, y = 49, lost = i < g.lost;
      ctx.fillStyle = lost ? '#5fd35f' : 'rgba(255,255,255,0.9)'; ell(ctx, x, y, 7.5, 6.5); ctx.fill();
      ctx.fillStyle = '#111'; ell(ctx, x - 2.5, y - 1, 1, 1.2); ctx.fill(); ell(ctx, x + 2.5, y - 1, 1, 1.2); ctx.fill();
      if (lost) { ctx.strokeStyle = '#c8102e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 7, y - 6); ctx.lineTo(x + 7, y + 6); ctx.moveTo(x + 7, y - 6); ctx.lineTo(x - 7, y + 6); ctx.stroke(); }
    }
    // active power-ups
    let y = 76;
    const bar = (name, frac, color) => {
      label(ctx, name, 14, y + 10, 12, '#fff');
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(84, y, 70, 9);
      ctx.fillStyle = color; ctx.fillRect(84, y, 70 * Math.max(0, Math.min(1, frac)), 9); y += 16;
    };
    if (p.speedT > 0) bar('HOT DOG', p.speedT / C.HOTDOG_TIME, '#ff9f43');
    if (p.coffeeT > 0) bar('COFFEE', p.coffeeT / C.COFFEE_TIME, '#c08552');
    if (g.freeze > 0) bar('FREEZE', g.freeze / C.FREEZE_TIME, '#9fe0ff');
    if (p.pucks > 0) bar('PUCKS', p.pucks / C.PUCKS, '#ddd');

    if (g.banner > 0) {
      const a = Math.min(1, g.banner, (2.4 - g.banner) * 4);
      ctx.globalAlpha = Math.max(0, a);
      label(ctx, g.bannerText, SS.W / 2, SS.H / 2 - 30, 54, '#fff', 'center');
      if (g.bannerSub) label(ctx, g.bannerSub, SS.W / 2, SS.H / 2 + 6, 22, '#ffd166', 'center');
      ctx.globalAlpha = 1;
    }
  }

  // ---------- frame ----------
  SS.render = function (ctx, g, showHud) {
    ctx.save();
    ctx.translate(0, SS.TOPBAR);
    if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
    drawWater(ctx, g);
    drawShip(ctx, g);
    for (const f of g.floes) drawFloe(ctx, f, g);

    for (const r of g.rings) {
      ctx.strokeStyle = `rgba(220,245,255,${1 - r.t / 0.7})`; ctx.lineWidth = 2.5;
      ell(ctx, r.x, r.y, 8 + r.t * 50, 4 + r.t * 22); ctx.stroke();
    }
    for (const u of g.powerups) drawPower(ctx, u, g);

    const list = [];
    for (const s of g.seals) list.push({ y: s.y, d: () => drawSeal(ctx, s, g) });
    for (const pr of g.protesters) list.push({ y: pr.y, d: () => drawProtester(ctx, pr, g) });
    if (g.player && showHud) list.push({ y: g.player.y, d: () => SS.drawPlayer(ctx, g.player.x, g.player.y, 1.2, g.player, g.time) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.d();

    for (const k of g.pucks) { shadow(ctx, k.x, k.y + 3, 6, 0.3); ctx.fillStyle = '#111'; ell(ctx, k.x, k.y - 4, 6, 3.5); ctx.fill(); }
    for (const q of g.particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.color;
      ell(ctx, q.x, q.y, q.size, q.size); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const t of g.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2.5);
      label(ctx, t.text, Math.max(70, Math.min(SS.W - 70, t.x)), t.y, t.big ? 21 : 15, t.color, 'center');
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const f of snow) {
      const x = (f.x + Math.sin(g.time * 0.7 + f.p) * 14 + g.time * 12) % SS.W, y = (f.y + g.time * f.v) % SS.H;
      ell(ctx, x, y, f.s, f.s); ctx.fill();
    }
    if (g.lostFlash > 0) { ctx.fillStyle = `rgba(80,220,80,${g.lostFlash * 0.25})`; ctx.fillRect(0, 0, SS.W, SS.H); }
    ctx.restore();
    if (SS.TOPBAR) {
      ctx.fillStyle = '#071a2b'; ctx.fillRect(0, 0, SS.W, SS.TOPBAR);
      ctx.fillStyle = 'rgba(127,180,214,0.35)'; ctx.fillRect(0, SS.TOPBAR - 1, SS.W, 1);
    }
    if (showHud) drawHUD(ctx, g);
  };
})();
