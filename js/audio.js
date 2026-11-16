// Synthesised sound effects (Web Audio, no files).
(function () {
  const SS = window.SS;
  let ctx = null, master = null, muted = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }

  function tone(type, f0, f1, dur, vol, delay) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, ftype, freq, delay) {
    const t = ctx.currentTime + (delay || 0);
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; f.type = ftype; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }

  const sfx = {
    bonk() { tone('square', 240, 60, 0.16, 0.3); tone('sine', 880, 420, 0.09, 0.2); noise(0.07, 0.35, 'lowpass', 1200); },
    swish() { noise(0.12, 0.15, 'bandpass', 1800); },
    splash() { noise(0.45, 0.35, 'lowpass', 900); tone('sine', 300, 80, 0.25, 0.15); },
    bark() { tone('sawtooth', 420, 260, 0.12, 0.14); tone('sawtooth', 460, 240, 0.14, 0.14, 0.16); },
    spray() { noise(0.25, 0.08, 'highpass', 5000); },
    jump() { tone('sine', 260, 520, 0.16, 0.14); },
    land() { noise(0.06, 0.18, 'lowpass', 500); },
    pickup() { tone('square', 523, 523, 0.08, 0.12); tone('square', 659, 659, 0.08, 0.12, 0.08); tone('square', 784, 784, 0.14, 0.12, 0.16); },
    puck() { tone('triangle', 700, 200, 0.1, 0.2); noise(0.05, 0.2, 'highpass', 2500); },
    freeze() { tone('sine', 1400, 2400, 0.5, 0.1); tone('sine', 1800, 3000, 0.5, 0.07, 0.1); },
    crack() { noise(0.12, 0.3, 'highpass', 1800); tone('square', 140, 60, 0.1, 0.12); },
    wave() { tone('square', 392, 392, 0.1, 0.12); tone('square', 523, 523, 0.1, 0.12, 0.11); tone('square', 659, 659, 0.22, 0.12, 0.22); },
    over() { tone('sawtooth', 392, 370, 0.25, 0.15); tone('sawtooth', 330, 300, 0.25, 0.15, 0.27); tone('sawtooth', 262, 130, 0.6, 0.15, 0.54); }
  };

  SS.audio = {
    init,
    play(name) { if (!ctx || muted || !sfx[name]) return; try { sfx[name](); } catch (e) { /* ignore */ } },
    toggle() { muted = !muted; return muted; }
  };
})();
