# Featherfall

A local 2–4 player bird-riding arcade game by Downcast Systems. Fly above a rival to knock them out. Five lives each. Last rider, or last team, wins.

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
5. Use **A / D** to move and repeatedly tap **W** to flap.

### Keyboard

| Keyboard seat | Join | Left       | Right       | Flap     |
| ------------- | ---- | ---------- | ----------- | -------- |
| 1             | 1    | A          | D           | W        |
| 2             | 2    | Left arrow | Right arrow | Up arrow |
| 3             | 3    | J          | L           | I        |
| 4             | 4    | F          | H           | T        |

- In the lobby, left/right changes your character. Choosing an occupied character swaps the two riders.
- Enter starts the match or rematch. At least two participants are required; bots count.
- Escape pauses/resumes. Losing focus automatically pauses the match.
- M or the Sound button toggles synthesized arcade sound, including during a match. Sound starts on after the first click or keypress. If a controller-only start is blocked by browser audio policy, click **Click for sound** once.
- Use the fullscreen button before starting a match. The playfield stays 16:9 on other aspect ratios.
- Multiple keyboards appear as one keyboard to the browser. Four humans sharing one keyboard may hit its simultaneous-key limit. Controllers avoid that hardware limitation.

### Xbox 360 controllers on Windows

1. Connect your wireless receiver and pair the controllers using your Windows setup.
2. Check that Windows recognizes every controller.
3. Run the localhost server, open the game in Chrome or Edge, and focus the game.
4. Press **Start** on each controller to reveal it to the browser and join. Powering it on alone may not expose it to the page.
5. Use the left stick or D-pad to choose a character. **Y** changes game mode. **X** changes your team in team mode.
6. Press **Start** again to ready. The match starts when all joined participants are ready. The on-screen Take flight button or keyboard Enter can also launch.

During play, left stick / D-pad moves, **A** flaps, and **Start** pauses/resumes. In the lobby, **B** or Back leaves. Disconnecting a participating controller pauses the game; reconnect it and press Start to resume. New participants join between matches.

The game uses the browser's [standard gamepad mapping](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/mapping). Browser detection depends on OS drivers, and some browsers expose a controller only after a button press. See [MDN's Gamepad API guide](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API). Physical Xbox 360 receiver/controller testing on Windows has **not** been performed here. Keyboard play and the standard four-gamepad input paths have been verified on the Mac development setup, with gamepads simulated in automated tests.

## Rules

- Four original color schemes: Ember, Mint, Iris, Sol. All physics and abilities are identical.
- Flapping requires fresh button presses. Holding the button does not repeatedly flap.
- Walk on ground and islands. Platforms are solid: land on top, bump down when hitting underneath, or rebound sideways at 110% of your incoming horizontal speed. Underside bumps are deliberately small. The solid body is 35 pixels thick; hanging vines and rock tips are decorative.
- Flying through one side of the screen brings you out on the other. The ground is safe.
- When birds touch, the higher rider wins. Nearly equal heights bounce apart.
- Each death costs one life and releases a burst of feathers. Riders with lives left respawn after 2.6 seconds on a floating platform chosen to maximize distance from living riders, including distance across the screen seam.
- Respawns have two seconds of sparkling protection. Protected riders cannot kill or be killed.
- A golden feather appears on an island after 18–26 seconds and periodically afterward. It grants one extra life and disappears after 15 seconds if unclaimed. It flashes before expiring.
- Free for all ends when one rider has lives remaining, including riders awaiting respawn.
- Teams use Sun and Moon sides, with no friendly fire. Each side needs at least one participant; 2v2 and uneven teams are supported. The last team with lives remaining wins.
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
- `audio.js`: procedural 8-bit flap chirps, alternating footsteps, feather-burst explosions, and other arcade tones.
- `style.css` / `index.html`: menus and HUD, scaled with the fixed 1920×1080 arena.
- `server.cjs`: loopback-only static development server.
- `tests/`: game rules and application input/transition tests.
- `PLAN.md`: implementation choices and acceptance criteria.
- `QA.md`: verification and hardware limitations.

This is a browser prototype, not a packaged native executable. The code is structured so more character traits, arenas, or game modes can be added later. Character colors are data; physics stays shared. No account, analytics, server multiplayer, or assets from Joust or Killer Queen are included.
