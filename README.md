# One Big Sky

A local 2–4 player flying-mount arcade game by Downcast Systems. Fly above a rival to knock them out. Five lives each. Last rider, or last team, wins.

## Play now

Open `index.html` in your browser. No install or build is needed for keyboard play. The included Mac and Windows launch files open it for you. All graphics, sounds, scripts, and styles are local; the game works offline.

For controller testing, use the localhost launcher with Node.js 18 or newer:

```sh
cd featherfall
npm start
```

Open **http://localhost:4173** in Chrome or Edge. No `npm install` is needed. Stop the server with Ctrl+C. If the default port is busy, set the `PORT` environment variable and open that port instead.

### Quick solo test

1. Press Enter to open the lobby.
2. Press **1** to join the first keyboard seat.
3. Click **Add bot** one to three times.
4. Press W to ready, then Enter to continue. Press Enter to select Free for all, then Enter again to launch.
5. Use **A / D** to move and tap or hold **W** to flap.

### Keyboard

| Seat | Join | Left / Right       | Flap (tap or hold) | Dive       | Boost       |
| ---- | ---- | ------------------ | ------------------ | ---------- | ----------- |
| 1    | 1    | A / D              | W                  | S          | E           |
| 2    | 2    | Left / Right arrow | Up arrow           | Down arrow | Right Shift |
| 3    | 3    | J / L              | I                  | K          | O           |
| 4    | 4    | F / H              | T                  | G          | Y           |

- Returning from the lobby to the main menu clears every player and bot slot. Reopening character selection starts with an empty lineup.
- In the lobby, left/right changes your character. Human players can choose the same character; bots choose unused mounts. Names include player numbers, such as SOL (P1).
- Your flap key readies your selected character. Click Ready again or press your boost key to unready. Ready choices stay locked until canceled. Enter opens match setup once everyone is ready. Up/down and Enter navigate the title, pause, and results menus. At least two participants are required; bots count.
- Escape pauses/resumes. Losing focus automatically pauses the match.
- M or the Sound button toggles synthesized arcade sound, including during a match. Sound starts on after the first click or keypress. If a controller-only start is blocked by browser audio policy, click **Click for sound** once.
- Fullscreen is available on the title, lobby, and pause screens. The playfield stays 16:9 on other aspect ratios.
- Multiple keyboards appear as one keyboard to the browser. Four humans sharing one keyboard may hit its simultaneous-key limit. Controllers avoid that hardware limitation.

### Xbox 360 controllers on Windows

1. Connect your wireless receiver and pair the controllers using your Windows setup.
2. Check that Windows recognizes every controller.
3. Run the localhost server, open the game in Chrome or Edge, and focus the game.
4. Press **Start** on each controller to reveal it to the browser and join. Powering it on alone may not expose it to the page.
5. Move the stick or D-pad through the 2×4 creature grid. Numbered circles show each player's focus. **A** locks in; **B** unlocks a ready choice or leaves an unready slot. The large tiles show mounts; the lineup above shows riders.
6. **X** adds one bot. **Y** removes the last bot added. Bots randomly pick unused mounts and adjust if a human selects theirs. Duplicate human choices are allowed.
7. Once at least two participants are all ready, **LET'S GO!** highlights. A separate **A** or **Start** opens match setup.
8. Choose **FREE FOR ALL** or **TEAMS** using up/down and A. In teams, left/right changes your own side; bots balance around the humans. Both teams must have a participant. When valid, **LET'S FLY!** highlights; **A** or **Start** begins.

During play, left/right moves, **A** taps or holds to flap, **down** dives straight down, **X** boosts in the direction you face, and **Start** pauses/resumes. On the title, pause, and results screens, use **up/down** and **A** to select options. **B** returns or resumes. In the lobby, **B** unreadies a ready rider, or leaves if already unready. Disconnecting a participating controller pauses the game; reconnect it and press Start to resume. New participants join between matches.

The game uses the browser's [standard gamepad mapping](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/mapping). Browser detection depends on OS drivers, and some browsers expose a controller only after a button press. See [MDN's Gamepad API guide](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API). Physical Xbox 360 receiver/controller testing on Windows has **not** been performed here. Keyboard play and the standard four-gamepad input paths have been verified on the Mac development setup, with gamepads simulated in automated tests.

## Rules

- Eight mounts: Ember's dragon, Mint's jay, Iris's pegasus, Sol's pterodactyl, Acorn's flying squirrel, Buzz's bee, Luna's moth and Ripple's blue flying fish. Their pixel artwork differs; collision bounds, movement, and abilities are identical.
- Tap to flap immediately or hold for a flap every 0.22 seconds. Holding down while airborne overrides flapping and boosts, cancels horizontal movement, and dives at 580–850 pixels/second. Platforms still stop dives.
- Boost starts fully charged and sends you horizontally at 650 pixels/second for 0.32 seconds. The HUD meter refills over 3.5 seconds after the burst. Release and press boost again to use another charge. Recharge pauses while dead or paused; respawning does not grant a free refill.
- Walk on ground and islands. Platforms are solid: land on top, bump down when hitting underneath, or rebound sideways at 110% of your incoming horizontal speed. Underside bumps are deliberately small. The solid body is 35 pixels thick; hanging vines and rock tips are decorative.
- Flying through one side of the screen brings you out on the other. Ground is safe except the open water in Snapwater Marsh.
- When birds touch, the higher rider wins. Nearly equal heights bounce apart.
- Each death costs one life and releases a burst of feathers. Riders with lives left respawn after 2.6 seconds on a floating platform chosen to maximize distance from living riders, including distance across the screen seam.
- Respawns have two seconds of sparkling protection. Protected riders cannot kill or be killed.
- A golden feather appears on an island after 18–26 seconds and periodically afterward. It restores one life, up to a maximum of five. Riders already at five lives can still collect it; the announcer calls out their full life count, and they stay at five. It disappears after 15 seconds if unclaimed. It flashes before expiring.
- Free for all ends when one rider has lives remaining, including riders awaiting respawn. After the final knockout, the arena stays visible for 1.6 seconds so the feather burst can finish before the winner screen appears.
- Teams use bright orange Sun and cyan Moon sides, with team panels in the lobby, HUD accents, and in-arena labels/brackets, with no friendly fire. Each side needs at least one participant; 2v2 and uneven teams are supported. The last team with lives remaining wins.
- Bots use the same physics and life rules. They are practice opponents, not a tuned difficulty system.

## Development

```sh
npm test
npm run check
npm start
```

No external dependencies or build step. Node's built-in test runner executes the rules and the real input/screen code against a small DOM fixture. Visual checks run in a browser separately.

- `engine.js`: fixed 120 Hz simulation, character data, arena geometry, combat, bots, gamepad mapping.
- `game.js`: Canvas 2D rendering, generated pixel art, lobby and input handling.
- `audio.js`: procedural character-specific flap sounds with subtle pitch variation, alternating footsteps, feather-burst explosions, a rising rebirth chime on respawn, and other arcade tones.
- `style.css` / `index.html`: menus and HUD, scaled with the fixed 1920×1080 arena.
- `server.cjs`: loopback-only static development server.
- `tests/`: game rules and application input/transition tests.
- `PLAN.md`: implementation choices and acceptance criteria.
- `QA.md`: verification and hardware limitations.

This is a browser prototype, not a packaged native executable. The code is structured so more character traits, arenas, or game modes can be added later. Character colors are data; physics stays shared. No account, analytics, server multiplayer, or assets from Joust or Killer Queen are included.

## Font credit

All menus, HUD text, and arena labels use the locally bundled Silkscreen font by Jason Kottke, distributed under the SIL Open Font License. Source: [Google Fonts Silkscreen](https://github.com/google/fonts/tree/main/ofl/silkscreen). The original license is included at `assets/fonts/OFL.txt`; no font service or internet connection is required.

## Occasional power-ups and KO feedback

One random power-up appears every 25–40 seconds, with equal chances for each type. Only one waits in the arena at a time; it disappears after 12 seconds if unclaimed. Golden feathers keep their separate spawn schedule.

- Flame: six lethal fireballs orbit for five seconds, then launch outward at 1,200 pixels/second and leave the arena. Launched balls pass through platforms.
- Sawblade: become a spinning blade for three seconds, moving at 900 pixels/second horizontally and 560 vertically. Wrap across the left and right edges, and ricochet off platforms, the ceiling and the ground. Movement inputs resume when it expires.
- Rocket: unlimited boost charges and 75% faster horizontal movement for ten seconds. Top movement speed is 577.5 pixels/second; boosts reach 1137.5 pixels/second. Release and press boost for each burst; flap and dive physics stay the same. Rear exhaust follows the mount, with a longer plume during boosts.

A pickup activates on contact. A new power replaces the current one, and death clears it. Fired projectiles finish their flight. Powers respect team immunity and spawn protection. Timers stop while paused. Power-ups have soft glows with no name labels. The HUD shows remaining seconds beside the hearts.

Bots seek useful pickups, favor feathers when missing lives, boost toward nearby targets, and dive at aligned opponents when platforms do not block the descent.

KO totals stay visible in each player's HUD, using "1 KO" and "0 KOs" or "2 KOs". Input-device labels and KO background flashes are omitted to keep the HUD compact. Chirp, the text announcer at the bottom of the screen, calls out KOs, eliminations and pickups one at a time. A bounded queue handles simultaneous events without covering the playfield. Eliminated players have a red OUT panel. Opposing powers can trade kills; if nobody has lives remaining, the round is a draw and nobody earns a win. If several attackers hit one victim in the same step, the first resolved hit gets the single KO.

## First to three

Each round starts with five lives and a full boost meter. The first player to win three rounds wins the match. In team mode, the first team to win three rounds wins; every teammate receives the team win, including teammates eliminated earlier in the round. Drawn rounds award no wins, but their KOs and performance stats still count.

Player panels are spread across the top with a maximum width of 360 pixels each, keeping their contents together even in two-player games. Cumulative KOs and wins are right-aligned beside each name at the same font size. Hearts share the second row with a short boost meter and power timer on the right. During respawns, RETURNING IN replaces the meter. There is no third status row. Round information and sound/pause controls sit at the right of the bottom announcer strip. At each round's end, the round results show that round's KOs and remaining lives alongside accumulated wins. Choose Next round to continue. After the deciding round, choose Match totals to see every player's cumulative KOs, wins and a performance award. Play again starts a new match with zero totals. Enter or controller A selects the highlighted option; controller Start advances from results too. Returning to the lobby abandons the current match.

Chirp's sports commentary is text-only and sits beneath the playable ground. He reacts to round starts, KOs, eliminations and collected pickups with a smug, profanity-free remark. He stays silent between events, with no idle filler or pickup-appearance calls. His beak moves while a call is displayed and closes when quiet or paused. Calls pause with gameplay. The central display is reserved for the countdown. Mint's jay now has a slim, pointed bill in both flying and diving poses.

There are 100 award titles in [AWARDS.md](AWARDS.md). Each player receives one randomly selected title from categories where their measured performance leads or ties the field. Awards show the supporting stat. No two players receive the same title. Completed-round awards provide a truthful fallback for players without another leading stat. Movement and action stats exclude dead time and pause time.

## Developer shortcut

Press **P** during active play to replace the waiting power-up with a random one on a random floating island. Press again to reroll. This does not stack pickups or activate one on a player. Held-key repeats, countdowns, pause and results ignore the shortcut. It is deliberately absent from the in-game controls. Normal power-up spawning resumes 25–40 seconds after the latest test spawn.

Chirp’s completed commentary stays visible at reduced brightness after its 4.5-second reading time. A new call immediately replaces it at full brightness; the beak stays still between calls.

## Arena rotation

Six arenas rotate in shuffled order: The Hollow Sky, Amber Aerie, Frostglass Peaks, Amethyst Ruins, Mossveil Canopy, and Cinder Crown. All platforms are mirrored left to right. Each setting has its own platform arrangement, sky palette, and distant scenery, with the same flight, collision, pickup and combat rules.

Every arena is used once before the next shuffle, with no immediate repeat across shuffle boundaries. The rotation continues across rematches while the game remains open.

Secret testing shortcut: press **N** during play, the countdown, or the round-ending animation to advance to the next arena and restart the current round with a fresh countdown. Unfinished-round KOs, lives, powers and statistics reset; completed-round totals remain. N consumes the next arena in the same rotation. It is ignored on menus, results and pause, and holding it does not cycle repeatedly. **P** still spawns a random power-up.

## Graveyard zombies

Amethyst Ruins has four little graves in mirrored pairs. Starting five seconds into a round, one tiny zombie emerges at a time, with a new random delay of two to five seconds between appearances and a random unoccupied grave each time. Graves beneath live players cannot spawn zombies; arriving during emergence cancels that zombie harmlessly. At most twelve can be alive. They climb out over 0.9 seconds, independently choose to walk left or right, and panic when they fall off a ledge, throwing their hands overhead, kicking unevenly and opening their mouths in a little scream.

Drops under 320 pixels let zombies land and keep walking. Drops of 320 pixels or more end in a harmless burst of red pixels with a short synthesized splat. Walking into a zombie or being struck by one from above costs a life; contact from a clear height advantage destroys it and gives the player a small bounce. Active boosts also smash through zombies safely. Respawn protection still works. Sawblades, orbiting fireballs and launched fireballs can also destroy zombies. Zombie kills award no KOs, wins or award statistics. Player deaths to zombies have no credited attacker.

Zombies pause with the round and disappear when it restarts or changes arenas. They wrap horizontally like players, including during a fall, and leave play after surviving forty seconds. Use **N** to cycle to the purple ruins to try them.

## Character choices and final ranks

The original four mounts are joined by Acorn, a brown flying squirrel; Buzz, a yellow-and-black bee; and Luna, a pale gray-and-ivory moth. All eight have the same flight and collision rules, with individual standing, flying and diving artwork and flap sounds. Cycle left/right through the roster; any player or bot can use any mount.

Match Totals displays a rank beside each player, ordered by round wins, then KOs. Equal wins and KOs share a rank, with occupied places skipped: 1, 2, 2, 4. Round result screens keep their existing layout. Bot cards show automatic readiness and a Remove Bot button instead of human ready/unready instructions.

## Volcano eruptions and zombie speed chains

Cinder Crown flashes before an eruption. After a 1.2-second warning, eighteen fireballs fall in a row, half a second apart, sweeping from a randomly chosen side. Fireballs explode against the first platform or vulnerable player they hit. Platforms provide cover; impact particles have no splash damage. The first warning is 10 seconds into the round, with 8–14 seconds of quiet after the last fireball from each wave disappears. A new eruption cannot start while a previous wave or its fireballs remain. Rain pauses and resets with the round.

Every player-attributed zombie kill grants another 10% horizontal movement and boost speed, including kills using powers. Stacks add: 10%, 20%, 30%, and so on. Each kill refreshes the timer to five seconds; expiry or death removes the entire chain. This multiplies rocket speed and applies to horizontal sawblade movement too. The boost meter displays the bonus and remaining seconds. Zombie kills still grant no KOs or wins.


## Snapwater Marsh and Ripple

Ripple is a blue flying fish with a forked tail, pale belly and broad pectoral fins, including a dedicated dive pose and flap sound. Mount physics remain identical.

Snapwater Marsh joins the shuffle rotation. Its platforms and two small banks are mirrored; the center river kills on contact, including during sawblade mode. Piranhas target riders within 220 pixels of the water, announce their launch with a 0.65-second ripple, then jump straight up and fall back in. Spawn protection applies. Hazards pause and reset with the round. Bots prioritize climbing away from the water.

## Testing with a keyboard

Join with 1–4. Each player's left/right keys navigate a row, the dive key switches rows, flap locks in, and boost cancels readiness. Enter opens match setup once everyone is ready. On setup, up/down selects a mode, flap or Enter confirms, and each player's left/right keys assign their team. The first confirmation chooses the mode; the next launches. Controller instructions take priority in the interface.

Chirp's larger, heavy-browed pixel portrait follows the supplied sketch. His beak and brows animate during event commentary, and exact player-name mentions use the selected mount's color. The game is named One Big Sky; its existing GitHub repository and checkout directory remain featherfall.
