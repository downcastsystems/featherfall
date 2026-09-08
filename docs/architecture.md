# Code organization

One Big Sky runs directly in a browser, including from `index.html` on disk. It uses plain scripts and Canvas 2D, with no bundler or runtime dependencies. Script order is declared in `index.html`.

## Simulation and match rules

- `engine.js` owns physics, collisions, bot decisions, arena definitions, hazards and power-ups. It can run without a DOM.
- `match-series.js` tracks rounds, match totals, rankings and awards.
- `broadcast.js` selects and queues Chirp's event commentary.
- `audio.js` synthesizes sound effects through Web Audio.

## Presentation

`game.js` composes the presentation modules and owns application state, round transitions and the fixed-step frame loop. Simulation still advances at its original fixed interval. Rendering runs once per animation frame, and HUD updates retain their original throttle.

Each file under `ui/` registers a factory on `OneBigSkyUI`. Factories receive shared application `state` and a `deps` object containing the engine constants and exported presentation functions. The composition root wires all exports before running initialization hooks. This lets event handlers call across modules without relying on partially initialized callbacks. Factories should define functions; event registration and initial drawing belong in `initialize()`.

| File | Responsibility |
| --- | --- |
| `ui/input.js` | Keyboard/gamepad events, controller connections, per-player input |
| `ui/menus.js` | Main menu, roster, readiness, bots, mode/team selection |
| `ui/results.js` | HUD, colored commentary, round and match results |
| `ui/portraits.js` | Creature head portraits |
| `ui/sprites.js` | In-game creatures, zombies and pixel clouds |
| `ui/background.js` | Arena scenery and cached background canvas |
| `ui/effects.js` | Event effects, particles, power-up artwork and sound dispatch |
| `ui/renderer.js` | Frame composition, hazards, players and particle drawing |

Mutable presentation values live in `state`; simulation values remain on `state.match`. Module exports are wired once at startup. Avoid adding gameplay rules to drawing code or adding per-frame DOM work to the render path.

## Verification

Run `npm run check` for syntax checks and `npm test` for simulation and presentation tests. The presentation fixture loads the actual script list from `index.html`, so tests also catch omitted or incorrectly ordered modules.

`presentation-parity.test.cjs` compares a seeded playthrough of all eight arenas against a pre-refactor capture, including Canvas commands, simulation state and sound events. The fixture substitutes a minimal DOM and Canvas, so a browser/controller playthrough remains useful for visual and physical-device checks.
