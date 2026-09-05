# Prototype verification

Verified on macOS, September 5, 2026.

## Automated

`npm test`: 20 passing tests.

- Five lives; distinct floating spawns; furthest available spawn selection across the wrap seam.
- Height-based knockouts, tied-height bounce, single life debit, wraparound combat.
- Defensive and offensive spawn protection; delayed respawn; permanent elimination.
- Team friendly-fire immunity and victory accounting for pending respawns.
- One-way platform landing, safe ground, horizontal wrapping, flap impulse.
- Golden feather spawn placement, single collection and expiration.
- Standard gamepad mapping, stick dead zone, D-pad and fresh-press edges.
- Complete four-bot free-for-all and team matches within ten simulated minutes.
- Bot landing attacks against a stationary opponent, including leaving intervening platforms.
- Real input/screen code with a DOM fixture: keyboard joining, key repeat, pause, winner and rematch.
- Four simulated controllers: join, character swaps, ready, flap, disconnect/reconnect, leave.
- Team selection validation and winner presentation; focus-loss pause and cleared inputs.

`npm run check`: syntax checks for both game scripts and the local server.

## Browser

Inspected the title screen, four-player lobby and active match in the Codex Chromium browser. Verified keyboard joining and flapping, bot matches, HUD/life updates, visible pickup and feather particles. Further final checks are recorded below after the review pass.

## Review fixes

- Full lobby character selection swaps riders, avoiding a locked selection when every color is occupied.
- Fullscreen targets the document, preserving arena letterboxing.
- Decorative menu birds are hidden behind the lobby to keep text clear.
- Empty seats advertise unused keyboard mappings after mixed controller/keyboard joins.
- Bots descend onto stationary rivals and walk off blocking platforms instead of hovering indefinitely.
- Respawn clears bot navigation state.

## Limitations

- No physical Xbox 360 receiver or controllers were available to validate Windows drivers and browser mapping. Four-controller tests use synthetic standard-mapping inputs.
- This is a local shared-screen browser game. It has no online multiplayer or native app installer.
- Mac keyboard testing is supported independently of Xbox controller driver availability on macOS.
