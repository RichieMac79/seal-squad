// Keyboard, mouse and touch input.
(function () {
  const SS = window.SS;
  const keys = {};
  const I = SS.input = {
    jx: 0, jy: 0, jump: false, swing: false,
    onPause: null, onMute: null, onAny: null,
    axis() {
      let x = I.jx, y = I.jy;
      if (keys.ArrowLeft || keys.KeyA) x -= 1;
      if (keys.ArrowRight || keys.KeyD) x += 1;
      if (keys.ArrowUp || keys.KeyW) y -= 1;
      if (keys.ArrowDown || keys.KeyS) y += 1;
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      return { x, y, m: Math.min(1, m) };
    },
    take(name) { const v = I[name]; I[name] = false; return v; }
  };

  const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
  window.addEventListener('keydown', e => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (I.onAny) I.onAny();
    if (e.repeat) return;
    keys[e.code] = true;
    if (e.code === 'Space') I.jump = true;
    if (e.code === 'KeyJ' || e.code === 'KeyK' || e.code === 'KeyX') I.swing = true;
    if (e.code === 'KeyP' || e.code === 'Escape') I.onPause && I.onPause();
    if (e.code === 'KeyM') I.onMute && I.onMute();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  SS.setupPointer = function (canvas) {
    canvas.addEventListener('pointerdown', e => {
      if (I.onAny) I.onAny();
      if (e.pointerType === 'mouse') I.swing = true;
    });

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');

    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let pid = null;
    const move = e => {
      const r = stick.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const max = r.width / 2 - 10, m = Math.hypot(dx, dy);
      if (m > max) { dx = dx / m * max; dy = dy / m * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      I.jx = Math.abs(dx / max) < 0.15 ? 0 : dx / max;
      I.jy = Math.abs(dy / max) < 0.15 ? 0 : dy / max;
    };
    const end = e => {
      if (e.pointerId !== pid) return;
      pid = null; I.jx = I.jy = 0; knob.style.transform = '';
    };
    stick.addEventListener('pointerdown', e => {
      e.preventDefault(); if (I.onAny) I.onAny();
      pid = e.pointerId;
      try { stick.setPointerCapture(pid); } catch (err) { /* capture is optional */ }
      move(e);
    });
    stick.addEventListener('pointermove', e => { if (e.pointerId === pid) move(e); });
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);

    const press = (id, name) => document.getElementById(id).addEventListener('pointerdown', e => {
      e.preventDefault(); if (I.onAny) I.onAny(); I[name] = true;
    });
    press('btnJump', 'jump');
    press('btnSwing', 'swing');
  };
})();
