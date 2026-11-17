// Tuning constants and difficulty presets.
window.SS = window.SS || {};

SS.W = 960;
SS.H = 600;
SS.BOTTOM = 600;         // bottom of the playable area (above the touch controls in portrait)
SS.TOPBAR = 0;           // height of the HUD strip drawn above the world (portrait only)

// Pick the world size for a viewport: the classic 960x600 in landscape, or a tall
// 600-wide world that fills the screen in portrait. reservePx is the strip of CSS
// pixels at the bottom covered by the touch controls. Returns true if anything changed.
SS.layout = function (vw, vh, reservePx) {
  const a = vh / Math.max(1, vw), portrait = a >= 1.3;
  const W = portrait ? 600 : 960;
  const bar = portrait ? 64 : 0;   // the ship nearly spans a 600-wide world, so the HUD gets its own strip
  const full = portrait ? Math.round(600 * Math.min(a, 2.3)) : 600;
  const H = full - bar;
  const scale = Math.min(vw / W, vh / full);
  const bottom = portrait ? Math.round(H - (reservePx || 0) / scale) : H;
  const changed = W !== SS.W || H !== SS.H || bottom !== SS.BOTTOM;
  SS.W = W; SS.H = H; SS.BOTTOM = bottom; SS.TOPBAR = bar;
  return changed;
};

// flee: seconds between a pup bolting for the water; maxFlee: how many can bolt at once
SS.DIFF = {
  easy:   { label: 'Easy',   speed: 30, count0: 3, ramp: 1.0, interval: 3.0, maxLost: 8, flee: [12, 18], maxFlee: 1, fragile: 0,    sprayTime: 2.6 },
  medium: { label: 'Medium', speed: 40, count0: 4, ramp: 1.5, interval: 2.4, maxLost: 5, flee: [8, 13],  maxFlee: 1, fragile: 0.25, sprayTime: 2.0 },
  hard:   { label: 'Hard',   speed: 52, count0: 5, ramp: 2.0, interval: 1.7, maxLost: 3, flee: [5, 9],   maxFlee: 2, fragile: 0.45, sprayTime: 1.6 }
};

SS.C = {
  TOP: 112,              // top of the playable area (the ship sits above it)
  SEALS: 7,
  PLAYER_SPEED: 155,
  JUMP_DIST: 125,
  JUMP_TIME: 0.42,
  SWING_TIME: 0.18,
  SWING_CD: 0.32,
  SWING_RANGE: 64,
  SWING_ARC: 1.35,       // radians either side of facing
  COMBO_TIME: 2.6,
  SEAL_FLEE_SPEED: 10,
  HERD_RANGE: 52,
  CRACK_TIME: 3.5,       // seconds of standing before a fragile floe sinks
  SUNK_TIME: 7,
  POWER_EVERY: [11, 17],
  POWER_LIFE: 11,
  HOTDOG_TIME: 8,
  COFFEE_TIME: 10,
  FREEZE_TIME: 6,
  PUCKS: 5
};
