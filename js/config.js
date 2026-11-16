// Tuning constants and difficulty presets.
window.SS = window.SS || {};

SS.W = 960;
SS.H = 600;

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
