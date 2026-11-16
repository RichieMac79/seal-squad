# Seal Squad

A small arcade game for the web browser, loosely inspired by the 1982 Gulf of St. Lawrence seal hunt protest.
You play a New Yorker in a hockey vest, hopping between ice floes and bonking protesters with a hockey stick
before they can spray the seal pups green.

## Run

Open `index.html` in a browser. There is no build step and nothing to install.

To serve it locally instead:

```bash
python3 -m http.server 8123
```

Then visit http://localhost:8123.

## Controls

| Action | Keyboard / mouse | Touch |
|---|---|---|
| Move | WASD or arrow keys | Left joystick |
| Jump (in the direction you face) | Space | JUMP |
| Swing the stick | J, K, X or mouse click | SWING |
| Pause | P or Esc | II button |
| Mute | M | ♪ button |

## Rules

- Protesters come off the ship and in from the sides, each heading for a seal pup. Bonk them first.
- Hits in quick succession build a combo multiplier (up to x8).
- Pups get spooked and flop toward the water. Stand next to one to calm it down.
- Every sprayed or escaped pup fills the "seals lost" meter. Fill it and the game is over.
- Bluish, cracked floes sink if you stand on them too long. Missing a jump costs you time and your combo.
- Pick-ups: hot dog (speed), puck (slapshots that hit at range), snowflake (freezes the water so you can run anywhere), coffee (longer jumps).

Difficulty changes protester speed and numbers, how many pups you can lose (8 / 5 / 3), how jumpy the pups are and how many floes crack.

## Code

- `js/config.js` — difficulty presets and tuning numbers
- `js/world.js` — ice floes
- `js/entities.js` — player, protesters, seals, power-ups
- `js/render.js` — drawing
- `js/audio.js` — synthesised sound
- `js/input.js` — keyboard and touch
- `js/main.js` — game loop and waves
