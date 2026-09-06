# Featherfall

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
3. Click **Add practice bot** one to three times.
4. Press Enter to launch.
5. Use **A / D** to move and tap or hold **W** to flap.

### Keyboard

| Seat | Join | Left / Right       | Flap (tap or hold) | Dive       | Boost       |
| ---- | ---- | ------------------ | ------------------ | ---------- | ----------- |
| 1    | 1    | A / D              | W                  | S          | E           |
| 2    | 2    | Left / Right arrow | Up arrow           | Down arrow | Right Shift |
| 3    | 3    | J / L              | I                  | K          | O           |
| 4    | 4    | F / H              | T                  | G          | Y           |

- In the lobby, left/right changes your character. Any number of players can choose the same character; changing yours never changes anyone else. Names include player numbers, such as SOL (P1).
- Your flap key readies your selected character. Click Ready again to unready, or press B to unready keyboard seats. Changing a character clears that rider's readiness. Enter starts the match from the lobby. Up/down and Enter navigate the title, pause, and results menus. At least two participants are required; bots count.
- Escape pauses/resumes. Losing focus automatically pauses the match.
- M or the Sound button toggles synthesized arcade sound, including during a match. Sound starts on after the first click or keypress. If a controller-only start is blocked by browser audio policy, click **Click for sound** once.
- Fullscreen is available on the title, lobby, and pause screens. The playfield stays 16:9 on other aspect ratios.
- Multiple keyboards appear as one keyboard to the browser. Four humans sharing one keyboard may hit its simultaneous-key limit. Controllers avoid that hardware limitation.

### Xbox 360 controllers on Windows

1. Connect your wireless receiver and pair the controllers using your Windows setup.
2. Check that Windows recognizes every controller.
3. Run the localhost server, open the game in Chrome or Edge, and focus the game.
4. Press **Start** on each controller to reveal it to the browser and join. Powering it on alone may not expose it to the page.
5. Left/right chooses a character. Up/down moves your highlighted selection through character, team, ready, and the lobby options. **A** selects. **Y** is a shortcut to change game mode; **X** changes your team in team mode.
6. Press **A** on your chosen character to ready immediately. A checkmark confirms it. **B** unreadies first; pressing B again leaves. The Ready button toggles readiness, and Start remains a shortcut. The match starts when all joined participants are ready. The controller-accessible Take flight option or keyboard Enter can also launch.

During play, left/right moves, **A** taps or holds to flap, **down** dives straight down, **X** boosts in the direction you face, and **Start** pauses/resumes. On the title, pause, and results screens, use **up/down** and **A** to select options. **B** returns or resumes. In the lobby, **B** unreadies a ready rider, or leaves if already unready. Disconnecting a participating controller pauses the game; reconnect it and press Start to resume. New participants join between matches.

The game uses the browser's [standard gamepad mapping](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/mapping). Browser detection depends on OS drivers, and some browsers expose a controller only after a button press. See [MDN's Gamepad API guide](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API). Physical Xbox 360 receiver/controller testing on Windows has **not** been performed here. Keyboard play and the standard four-gamepad input paths have been verified on the Mac development setup, with gamepads simulated in automated tests.

## Rules

- Four mounts: Ember's dragon, Mint's jay, Iris's pegasus, and Sol's pterodactyl. Their pixel artwork differs; collision bounds, movement, and abilities are identical.
- Tap to flap immediately or hold for a flap every 0.22 seconds. Holding down while airborne overrides flapping and boosts, cancels horizontal movement, and dives at 580–850 pixels/second. Platforms still stop dives.
- Boost starts fully charged and sends you horizontally at 650 pixels/second for 0.32 seconds. The HUD meter refills over 3.5 seconds after the burst. Release and press boost again to use another charge. Recharge pauses while dead or paused; respawning does not grant a free refill.
- Walk on ground and islands. Platforms are solid: land on top, bump down when hitting underneath, or rebound sideways at 110% of your incoming horizontal speed. Underside bumps are deliberately small. The solid body is 35 pixels thick; hanging vines and rock tips are decorative.
- Flying through one side of the screen brings you out on the other. The ground is safe.
- When birds touch, the higher rider wins. Nearly equal heights bounce apart.
- Each death costs one life and releases a burst of feathers. Riders with lives left respawn after 2.6 seconds on a floating platform chosen to maximize distance from living riders, including distance across the screen seam.
- Respawns have two seconds of sparkling protection. Protected riders cannot kill or be killed.
- A golden feather appears on an island after 18–26 seconds and periodically afterward. It restores one life, up to a maximum of five. Riders already at five lives can still collect it; they see “MAX LIVES REACHED” and stay at five. It disappears after 15 seconds if unclaimed. It flashes before expiring.
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
- Sawblade: become a spinning blade for three seconds, moving at 900 pixels/second horizontally and 560 vertically. Ricochet off platforms and arena edges. Movement inputs resume when it expires.
- Rocket: unlimited boost charges and 25% faster horizontal movement for ten seconds. Top movement speed is 412.5 pixels/second; boosts reach 812.5 pixels/second. Release and press boost for each burst; flap and dive physics stay the same. Rear exhaust follows the mount, with a longer plume during boosts.

A pickup activates on contact. A new power replaces the current one, and death clears it. Fired projectiles finish their flight. Powers respect team immunity and spawn protection. Timers stop while paused. Power-ups have soft glows with no name labels. The HUD shows remaining seconds beside the KO count.

Bots seek useful pickups, favor feathers when missing lives, boost toward nearby targets, and dive at aligned opponents when platforms do not block the descent.

KO totals stay visible in each player's HUD, using "1 KO" and "0 KOs" or "2 KOs". Input-device labels and KO background flashes are omitted to keep the HUD compact. A six-second feed keeps the last four KOs, including simultaneous eliminations. Eliminated players have a red OUT panel. Opposing powers can trade kills; if nobody has lives remaining, the match is a draw. If several attackers hit one victim in the same step, the first resolved hit gets the single KO.
