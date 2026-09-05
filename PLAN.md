# Featherfall prototype

Standalone browser game, separate from the parent website. No runtime dependencies, downloads, accounts, or network services. A Canvas 2D renderer and a fixed-step simulation keep the rules testable and portable. Open index.html directly for keyboard play or use the localhost server for gamepads.

## Acceptance checks

- Start → character lobby → 2–4 players → countdown → match → winner → rematch.
- Four equal selectable riders, keyboard seats, hot-plug standard gamepads, optional bots.
- Flap requires fresh presses. Walking, gravity, solid platforms, wraparound, height-based combat.
- Five lives, feather deaths, delayed distant platform respawns, visible spawn protection, platform extra lives.
- FFA or two teams, no friendly fire, correct winner when respawns are pending.
- Fullscreen, pause, focus-loss pause, controller-disconnect pause, sound toggle.
- Unit tests for rules and input edges; browser smoke and visual checks; final review.

## Decisions

- 1920×1080 logical arena, scaled and letterboxed to fit any display.
- Identical physics for all characters. Character data is independent from physics.
- New controllers can join in the lobby. The match roster is locked until the next lobby.
- Tied-height collisions bounce. Protected riders cannot kill or be killed.
- No terrain hazards: touching the ground is safe. Lives are capped at five. Full-life riders cannot consume extra-life pickups.
- Windows hardware verification is deferred to the user; simulate gamepad input during development.

## Solid platform update

Use swept body collisions against the 35-pixel platform body. Preserve landing and walking. Verify underside bumps, proportional rebounds from both sides, diagonal corners, edge exits, bot navigation, and existing match/input rules.

## Arcade sound update

Enable audio on first user interaction, with a visible browser-unlock fallback. Add distinct flap, walking and feather-death sounds with bounded duration and muted voice suppression. Keep the sound control available in the HUD. Verify event timing and audio lifecycle alongside existing gameplay tests.
