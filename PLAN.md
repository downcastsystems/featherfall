# Featherfall prototype

Standalone browser game, separate from the parent website. No runtime dependencies, downloads, accounts, or network services. A Canvas 2D renderer and a fixed-step simulation keep the rules testable and portable. Open index.html directly for keyboard play or use the localhost server for gamepads.

## Acceptance checks

- Start → character lobby → 2–4 players → countdown → match → winner → rematch.
- Four equal selectable riders, keyboard seats, hot-plug standard gamepads, optional bots.
- Flap accepts fresh presses or a steady held-button cadence. Walking, gravity, solid platforms, wraparound, height-based combat.
- Five lives, feather deaths, delayed distant platform respawns, visible spawn protection, platform extra lives.
- FFA or two teams, no friendly fire, correct winner when respawns are pending.
- Fullscreen, pause, focus-loss pause, controller-disconnect pause, sound toggle.
- Unit tests for rules and input edges; browser smoke and visual checks; final review.

## Decisions

- 1920×1080 logical arena, scaled and letterboxed to fit any display.
- Identical physics for all characters. Character data is independent from physics.
- New controllers can join in the lobby. The match roster is locked until the next lobby.
- Tied-height collisions bounce. Protected riders cannot kill or be killed.
- No terrain hazards: touching the ground is safe. Lives are capped at five. Full-life riders can consume extra-life pickups and receive a “MAX LIVES REACHED” message.
- Windows hardware verification is deferred to the user; simulate gamepad input during development.

## Solid platform update

Use swept body collisions against the 35-pixel platform body. Preserve landing and walking. Verify underside bumps, proportional rebounds from both sides, diagonal corners, edge exits, bot navigation, and existing match/input rules.

## Arcade sound update

Enable audio on first user interaction, with a visible browser-unlock fallback. Add distinct flap, walking and feather-death sounds with bounded duration and muted voice suppression. Keep the sound control available in the HUD. Verify event timing and audio lifecycle alongside existing gameplay tests.

## Movement, controller and pixel-art update

- Tap or hold A to flap; held flaps repeat every 0.22 seconds. Down dives straight down, up to 850 px/s, only in the air.
- X boosts horizontally for 0.32 seconds at 650 px/s. Recharge takes 3.5 seconds of living gameplay after the burst. Start with a full meter; death does not refill it. Airborne dive takes precedence over boosting; holding down suppresses flap even when landing.
- Keyboard defaults: P1 A/D, W flap, S dive, E boost; P2 arrows, right Shift boost; P3 J/L, I flap, K dive, O boost; P4 F/H, T flap, G dive, Y boost.
- Controller menus: up/down focus, A select, B back; Start remains join/ready/pause. Character lobby retains per-player cursors, duplicate characters, and optional shortcuts for team/mode.
- Four mounts share the existing 20x33 terrain body and identical combat bounds. Dragon, jay, pegasus and pterodactyl silhouettes vary only visually.
- Bundle the OFL Silkscreen pixel font for all DOM and canvas text; no online font requirement.
- Orange Sun / cyan Moon team bands, badges and arena markers. Player-specific messages always use NAME (Pn).
- Verify dive/platform/collision behavior; boost recharge and edge presses; held flap input; menus and duplicate selection; identity messages; same hitboxes; browser visual checks at the available 1280x720 viewport.
- Prepare and test changes in /tmp/featherfall-next, then sync the verified changes into /Users/dhaynes/Workspace/DowncastSystems/featherfall. Preserve the existing Git history and current localhost entry point.


### Update verification

Complete: 49 automated tests and syntax checks pass. Browser checks cover all screens and a completed match. Reviewed input edges, simultaneous dive/flap landing, boost collision/recharge, independent character choices, names, and offline fonts. Hardware limitations are recorded in QA.md.

## Bot, power-up, KO and readiness update

- Bots use boost and dive inputs, approach feathers and powers, and retain platform routing. Check both input decisions and completed collection before expiry.
- Add one random power every 25–40 seconds, expiring unclaimed after 12 seconds. Flame lasts 5 seconds then launches six balls; sawblade ricochets for 3 seconds; rocket removes recharge for 10 seconds.
- Keep team immunity, protection, pause, death/respawn and rematch consistent. Resolve power hits together so trades can produce a draw; credit each victim once.
- Show prominent KO totals and OUT panels. Preserve concurrent kills in a bounded six-second feed.
- Flap/A confirms the current character; B unreadies before leaving; mouse Ready toggles. Keep explicit host launch and controller menu navigation.
- Verify automated simulation/input tests, browser ready controls and match rendering, then review the diff and sync the tested files to the standalone repository.
