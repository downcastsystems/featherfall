# Prototype verification

Verified on macOS, September 5, 2026.

## Automated

`npm test`: 49 passing tests.

- Five lives; distinct floating spawns; furthest available spawn selection across the wrap seam.
- Height-based knockouts, tied-height bounce, single life debit, wraparound combat.
- Defensive and offensive spawn protection; delayed respawn; permanent elimination.
- Team friendly-fire immunity and victory accounting for pending respawns.
- Solid platform landing and underside/side rebounds, safe ground, horizontal wrapping, flap impulse.
- Golden feather spawn placement, single collection and expiration.
- Standard gamepad mapping, stick dead zone, D-pad and fresh-press edges.
- Complete four-bot free-for-all and team matches within ten simulated minutes.
- Bot landing attacks against a stationary opponent, including leaving intervening platforms.
- Real input/screen code with a DOM fixture: keyboard joining, key repeat, pause, winner and rematch.
- Four simulated controllers: join, independent duplicate character picks, ready, flap, disconnect/reconnect, leave.
- Team selection validation and winner presentation; focus-loss pause and cleared inputs.

`npm run check`: syntax checks for both game scripts and the local server.

## Browser

Inspected the title screen, four-player lobby and active match in the Codex Chromium browser. Verified keyboard joining and flapping, HUD/life updates, visible pickup and feather particles, sound toggle, pause during countdown, resume, team selection, a complete 44-second team match, winner scoreboard and rematch with all lives restored. No browser errors or warnings were logged.

The embedded browser retained a 1280×720 viewport when its fullscreen button was invoked. Native browser fullscreen behavior and physical TV output remain to be checked outside the embedded browser. The layout maintained its 16:9 ratio.

## Review fixes

- Character selection is independent for every seat, including when all four choose the same mount.
- Fullscreen targets the document, preserving arena letterboxing.
- Decorative menu birds are hidden behind the lobby to keep text clear.
- Empty seats advertise unused keyboard mappings after mixed controller/keyboard joins.
- Bots descend onto stationary rivals and walk off blocking platforms instead of hovering indefinitely.
- Respawn clears bot navigation state.

## Limitations

- No physical Xbox 360 receiver or controllers were available to validate Windows drivers and browser mapping. Four-controller tests use synthetic standard-mapping inputs.
- This is a local shared-screen browser game. It has no online multiplayer or native app installer.
- Mac keyboard testing is supported independently of Xbox controller driver availability on macOS.

## Solid platform update

Added regression coverage for underside bumps, proportional side rebounds in both directions, diagonal corner impacts, walking off edges, and bots routing around solid roofs. Rider collisions use a swept 20-pixel-wide body extending 21 pixels above the center and 12 below.

## Arcade sound update

Sound defaults on after user activation. Added a reusable procedural audio module, flap effects for every rider, alternating distance-based footsteps, layered feather-burst explosions, and a mute control during matches. Tests verify audio activation, effect scheduling, short voice lifetimes and cleanup, immediate mute, re-enabling sound, overlapping event limits, unsupported audio, and footsteps only while walking. Browser smoke checks verified Start activation, the in-match sound control, keyboard mute, and click-to-unmute. Speaker output and subjective volume balance still depend on the playback device.

## Five-life limit

Extra-life pickups restore riders below five lives. Full-life riders also collect them, but remain at five and see “MAX LIVES REACHED”. Regression checks cover four-to-five restoration, full-life pickup consumption, single consumption with overlapping riders, and the correct on-screen message for both cases.

## Respawn audio

A rising four-note square-wave arpeggio and soft octave shimmer play with the respawn sparkles. Tests verify ascending notes, a 0.6-second duration, mute behavior, and exactly one cue after the respawn delay rather than at death or the initial countdown.

## Winner-screen delay

The settled match remains visible for 1.6 seconds, with feather particles animating before the results overlay. Tests cover delayed results in free-for-all and teams, frozen combat, early Enter presses, pausing/resuming the delay, and resetting it on rematch.

## Individual flap sounds

Ember has a low triangle flutter, Mint an airy rising chirp, Iris a hollow sine wingbeat, and Sol a light triangle flutter. Pitched components are quieter than the original flap, with slight pitch variation between presses. Simultaneous flaps use separate per-character rate limits. Tests verify distinct sound profiles, overlap handling, and sound selection following character choice rather than player slot.

## Softer flap transients

Flaps now use 25 ms fade-ins, longer 120–160 ms envelopes, smooth pitch glides, and fade fully to zero before stopping. Their noise layers are quieter and filtered more heavily. Sol no longer uses a sharp square wave. Regression coverage checks every character’s gentle attack, zero-amplitude tail, and absence of stepped pitch changes.

## Version 0.2 movement and presentation

- Verified straight-down dives, dive attacks, fast platform landing, and full-speed side rebounds during boosts.
- Verified boost direction, consumption, recharge, no refill on death, paused recharge, and no repeat from holding X.
- Verified held keyboard/gamepad flaps at a steady cadence while fresh presses remain immediate. Holding down suppresses flap, including after landing, preventing repeated hop/dive cycles.
- Exercised controller-only lobby navigation, adding a practice bot, selecting teams, readying, pause options, sound selection, return to lobby, results navigation, and duplicate character selection. These use the real input code with simulated standard gamepads.
- Checked title, empty/four-player lobbies, orange/cyan teams, active team HUD, pause, and results at the embedded browser's 1280x720 viewport. Completed a human-versus-bot match to inspect the new winner identity and scoreboard. No browser warnings or errors were logged.
- All inspected DOM typography resolves to locally bundled Silkscreen; canvas labels use the same font. Font files and OFL license ship with the offline game.
- All four mount types use shared movement, combat, and terrain collision rules. Artwork is cosmetic.

Physical controller feel, Windows receiver drivers, native fullscreen, and large-TV readability remain for hardware playtesting. Browser audio/fullscreen policies may still require an initial click or keypress.

## Dive animation

Added original nose-down pixel poses for all four mounts, tucked wing motion, a trailing scarf, and segmented upward speed streaks. The rider leans along the mount. Animation uses simulation time and freezes during pause; landing or releasing dive restores normal artwork. Physics and hitboxes are unchanged. Reviewed all four poses enlarged and at game size in the browser, facing both directions. All 49 existing tests and syntax checks pass with the new renderer.

## September 6, 2026 update

62 automated tests and syntax checks pass. Added coverage for actual bot collection of elevated feathers and each power before expiry; boost and unobstructed dive decisions; scarcity and single collection; full power durations; orbit and launch damage; saw ricochets; repeated rocket bursts; team/protection rules; death cleanup; simultaneous final kills and draw resolution. Input tests cover direct A/flap readiness, B unready before leaving, mouse toggles, selection changes, concurrent KO messages, and paused/reset power timers.

Browser checks at 1280×720 cover the ready checkmark, four-player match, KO feed and totals. A temporary deterministic scene exercises the real renderer for all three active powers, pickup art and the red OUT panel. No browser console errors were recorded. The temporary scene is not part of the shipped game. Physical controller and Windows hardware limitations above still apply.

## September 6 polish follow-up

66 tests pass, plus syntax checks. Added checks for Rocket's 25% acceleration/top speed/boost bonus, both directions, faster platform rebounds, pickup/replacement/expiry during a burst, and dive precedence. Presentation checks cover 0/1/2 KOs in the HUD, feed and results, removal of device labels and flashes, and retained respawn feedback. Browser visual checks use a temporary deterministic scene at 1280×720 for glows, the rocket silhouette, compact HUD and rear exhaust facing left, right and up during dives. Temporary preview pages are excluded from the game repository.

## Announcer and match scoring update

80 automated tests and syntax checks pass. Checks cover cumulative first-to-three FFA and team scores, draws, duplicate result protection, round-to-final result sequencing, clean new matches, controller Start progression, 100 unique stat-qualified awards, truthful fallback awards, movement/action telemetry across death and respawn, bottom commentary queuing/pause/expiry, and the P shortcut's active-play-only behavior.

Browser checks at 1280×720 cover the jay preview, live bottom commentary beneath the ground, cumulative KOs and wins in round two, P spawning a visible pickup, and round result layout. A temporary accelerated round fixture checks all three result transitions and the four-player match totals/award layout using the real presentation code. This fixture is excluded from the repository. Physical controller/Windows limitations above remain unchanged.

## Full-width status bar

80 tests and syntax checks pass. Visual checks at 1280×720 cover four evenly spaced team panels, names and double-digit KO totals on one line at equal font sizes, inline power/respawn timers, and the OUT state. The panels use three rows. The relocated bottom Pause and Sound buttons were clicked successfully; no browser errors were recorded.

## Rocket speed and Chirp personality

81 tests and syntax checks pass. Rocket movement and boosts are another 25% faster than the previous Rocket, with expiry, pickup, collision and dive checks retained. Commentary tests verify silence without events, no pickup-appearance filler, event-specific lines, and beak animation state through speaking, pause, resume and silence. RETURNING IN stays beside the hearts; the proposed boost-row move was discarded.

## Two-row player HUD

Moved the boost meter into the hearts row and shortened it to 150 pixels. Respawn countdowns replace the meter; active power timers sit beside it. All 81 tests and syntax checks pass. A four-player browser check showed ready, recharging and respawning states with no panel overflow, and each panel is now 57 pixels tall.

## Sawblade horizontal wrapping

Sawblades now use the same horizontal wrapping as riders, preserving horizontal velocity across either edge. Regression checks cover both wrap directions, ceiling and ground bounces, all four faces of every floating platform, and safe power expiry. All 83 tests and syntax checks pass. Existing rendering already draws sawblades across the wrap seam.

## Retained Chirp commentary

Completed calls remain visible and fade to 55% opacity over 600ms after the existing 4.5-second reading period. New calls replace them at full brightness. All 84 tests and syntax checks pass, including retained text, replacement, reset, and the speaking/pause lifecycle.

## Player panel width cap

Player HUD columns now cap at 450 pixels with space distributed between panels. A two-player browser check confirmed both panels remain 450 pixels wide with no content overflow. All 84 tests and syntax checks pass.

## Six arenas and shuffled rotation

91 tests and syntax checks pass. New checks cover six unique layouts, mirrored platform geometry and separation, full shuffled cycles with no seam repeat, per-match spawns and pickups, rider landings and sawblade rebounds on every platform face, and bot simulation on all six arenas. Integration checks cover normal round changes, the N shortcut, current-round reset versus completed totals, pause/repeat guards and Player 3's L movement control.

Inspected all six arenas in the browser: the original hollow moon, amber sun and mesas, frosty auroras, amethyst columns and shards, misty conifers, and volcanic crown. Platforms and player labels remain readable. Verified N visibly changes the arena and restarts the countdown. No browser console errors were reported.

## Graveyard zombies

102 tests and syntax checks pass. Coverage includes mirrored, capped waves; emergence; walking off ledges; short-drop survival; long-drop bursts; natural grave-to-platform-to-ground routes; side and falling contact deaths; stomps and dives; spawn immunity; offensive power hits; score neutrality; harmless burst effects; lifetime cleanup; simultaneous final deaths; pause and next-arena reset. Audio checks verify the layered splat, simultaneous-pop throttling and mute behavior.

Browser checks verified grave placement and live walking zombies on Amethyst Ruins, player-death commentary and no console errors. Enlarged previews were used to inspect and refine all four falling-arm poses. Temporary preview pages are excluded from the repository.

## Panicked zombie falls

Replaced the rotary arm poses with four asymmetrical overhead flails, scissoring kicks and a wide-eyed, open-mouth expression at ten frames per second. Checked enlarged frames facing both directions. Syntax checks and all 103 tests pass; collision and fall-height behavior are unchanged.

## Safe graves and zombie wrapping

Occupied graves are excluded from spawn selection, and an emergence is canceled if a live player arrives. Zombies wrap horizontally while preserving velocity and fall height; rendering draws them across the seam. All 108 tests and syntax checks pass, including fully occupied graveyards, arrivals during emergence, both wrapping directions, grounded/falling states, seam contact without false cross-arena hits, and ground landings during a wrap.

## New mounts, ranked totals and lobby reset

115 tests and syntax checks pass. New coverage includes seven-character selection and shared physics, the new flap sounds and mute, wins/KO ranking with exact ties, displayed ranks, controller-only bot removal with RB or the focused button, preservation of X team switching, empty lineups after returning to the main menu, and bot-specific instructions.

Browser checks inspected Acorn, Buzz and Luna in standing, flapping and diving poses, the full four-player lobby, bot removal and a cleared lobby after returning to the main menu. A temporary results fixture verified ranks 1, 2, 2, 4 fit alongside names and awards. No console errors. Preview fixtures are excluded from the repository.

## Volcano rain and zombie speed chains

All 124 tests and syntax checks pass. New checks cover warning-before-rain timing, both nine-column sweep directions, one-second spacing, arena restriction, first-platform cover, swept player hits, protection, no KO attribution, pause/resume and fresh-round cleanup. Zombie checks cover rising height advantage, boost-through collisions, additive stacks, five-second refresh, active burst expiry, rocket multiplication, death/respawn reset and launched-flame ownership.

Browser fixtures verified the glowing fireballs and tails against Cinder Crown and the compact bonus/timer inside the existing HUD. Fixtures are excluded from the shipped files. Final diff review corrected sawblade entry to preserve horizontal speed bonuses. No unresolved findings.

## Chirp portrait

Refreshed the native SVG portrait with a crest, half-lidded eye, raised eyebrow, shaped beak, headset microphone and bow tie. Existing talking state drives beak motion, subtle head bob and eyebrow movement; an occasional blink adds idle expression. Decorative head/eyebrow/blink animation respects reduced motion. Browser inspection at actual 48px HUD size and 6x enlargement confirmed silhouette and footer fit. Syntax checks and all 124 existing tests pass. Diff review found no remaining issues; temporary preview HTML is excluded.

## Luna moth and Buzz stinger

Luna now has four broad stepped ivory wings with muted gray borders, warm ringed eyespots, a fluffy collar, large dark eye and branched antennae. Folded dive wings retain the pattern. Buzz has a small pointed rear stinger, oriented upward when diving. Browser pose-sheet inspection checked rest, upstroke, downstroke and dive using the actual drawing function, including rider visibility. Syntax checks and all 124 tests pass. Diff review confirmed presentation-only changes and unchanged collision geometry; preview fixtures are excluded.

## Rocket speed increase

Changed the shared rocket multiplier from 1.5625 to 1.75. Normal movement caps at 577.5 px/s and rocket boost bursts reach 1137.5 px/s, before zombie bonuses. All 124 tests and syntax checks pass, including grounded/airborne speed, unchanged vertical motion, boost equip/expiry and zombie-stack multiplication. Diff review confirmed the runtime change is limited to the shared multiplier.
