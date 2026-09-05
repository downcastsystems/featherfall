// Execute the real presentation/input code against a minimal DOM and canvas fixture.
// This tests input timing and screen transitions without requiring browser installs.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const Engine = require("../engine.js");
function fixture() {
  const elements = new Map(),
    listeners = new Map();
  let frame,
    stamp = 1000,
    pads = [],
    latest;
  const context = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    },
    { get: (o, k) => o[k] || (() => {}) },
  );
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        id,
        hidden: ["lobby", "hud", "pause", "results"].includes(id),
        style: {},
        textContent: "",
        innerHTML: "",
        disabled: false,
        focus() {},
        attributes: {},
        setAttribute(key, value) {
          this.attributes[key] = value;
        },
        getContext: () => context,
        addEventListener(type, fn) {
          this[type] = fn;
        },
        click() {
          this.onclick?.();
        },
      });
    return elements.get(id);
  };
  const document = {
    getElementById: element,
    createElement: () => element("canvas" + elements.size),
    documentElement: element("html"),
    body: { classList: { toggle() {} } },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
  };
  class Match extends Engine.Match {
    constructor(...args) {
      super(...args);
      latest = this;
    }
  }
  const soundEvents = [];
  const soundCalls = [];
  class RecordedAudio extends require("../audio.js") {
    play(kind, variant) {
      soundEvents.push(kind);
      soundCalls.push({ kind, variant });
      super.play(kind, variant);
    }
  }
  const sandbox = {
    Featherfall: { ...Engine, Match },
    ArcadeAudio: RecordedAudio,
    document,
    window: {},
    innerWidth: 1280,
    innerHeight: 720,
    navigator: { getGamepads: () => pads },
    requestAnimationFrame: (fn) => (frame = fn),
    addEventListener: (type, fn) => listeners.set(type, fn),
    console,
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../game.js"), "utf8"),
    sandbox,
  );
  function advance(seconds = 1 / 60) {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) {
      stamp += 1000 / 60;
      frame(stamp);
    }
  }
  function key(code, repeat = false) {
    listeners.get("keydown")({ code, repeat, preventDefault() {} });
  }
  function release(code) {
    listeners.get("keyup")({ code });
  }
  function press(code) {
    key(code);
    release(code);
  }
  function pad(index) {
    const p = {
      index,
      connected: true,
      axes: [0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
    };
    pads.push(p);
    return p;
  }
  function button(p, index) {
    p.buttons[index].pressed = true;
    advance();
    p.buttons[index].pressed = false;
    advance();
  }
  return {
    soundEvents,
    soundCalls,
    element,
    advance,
    key,
    press,
    release,
    pad,
    button,
    listeners,
    disconnect(p) {
      pads = pads.filter((q) => q !== p);
      advance();
    },
    reconnect(p) {
      pads.push(p);
      advance();
    },
    get match() {
      return latest;
    },
  };
}
test("keyboard menu, two players, fresh-press flaps, pause and rematch", () => {
  const f = fixture();
  f.press("Enter");
  assert.equal(f.element("lobby").hidden, false);
  f.press("Digit1");
  assert.equal(f.element("launch").disabled, true);
  f.press("Digit2");
  assert.equal(f.element("launch").disabled, false);
  f.press("Enter");
  f.advance(3.2);
  const m = f.match;
  assert.equal(m.players.length, 2);
  assert.equal(f.element("hud").hidden, false);
  const p = m.players[0],
    before = p.y;
  f.key("KeyW");
  f.advance();
  assert.ok(p.y < before);
  f.advance(0.15);
  const v = p.vy;
  f.key("KeyW", true);
  f.advance();
  assert.ok(p.vy > v, "repeat event must not flap");
  f.release("KeyW");
  f.key("KeyW");
  f.advance();
  assert.ok(p.vy < v, "new press must flap");
  f.release("KeyW");
  f.press("Escape");
  const time = m.time;
  f.advance(1);
  assert.equal(m.time, time);
  assert.equal(f.element("pause").hidden, false);
  f.press("Enter");
  f.advance();
  assert.ok(m.time > time);
  m.players[1].alive = false;
  m.players[1].lives = 0;
  f.advance(1.7);
  assert.equal(f.element("results").hidden, false);
  assert.match(f.element("winner-title").textContent, /EMBER \(P1\) wins!/);
  f.press("Enter");
  assert.notEqual(f.match, m);
  assert.ok(f.match.players.every((p) => p.lives === 5));
});
test("four gamepads join, select, ready, flap, disconnect, reconnect and leave", () => {
  const f = fixture(),
    pads = [0, 1, 2, 3].map((i) => f.pad(i));
  f.button(pads[0], 9);
  for (const p of pads.slice(1)) f.button(p, 9);
  assert.match(f.element("seats").innerHTML, /CONTROLLER 4/);
  // Duplicate picks leave every other player alone.
  pads[0].axes[0] = 1;
  f.advance();
  pads[0].axes[0] = 0;
  f.advance();
  for (const p of pads) f.button(p, 9);
  f.advance(3.2);
  assert.equal(f.match.players.length, 4);
  assert.equal(f.match.players[0].character, 1);
  assert.equal(f.match.players[1].character, 1);
  const before = f.match.players[0].y;
  f.button(pads[0], 0);
  assert.ok(f.match.players[0].y < before);
  f.disconnect(pads[2]);
  assert.equal(f.element("pause").hidden, false);
  const time = f.match.time;
  f.button(pads[0], 9);
  f.advance();
  assert.equal(f.match.time, time, "cannot resume with missing controller");
  f.reconnect(pads[2]);
  f.button(pads[0], 9);
  assert.equal(f.element("pause").hidden, true);
  assert.ok(f.match.time > time);
  f.button(pads[0], 9);
  f.element("quit").click();
  f.button(pads[3], 1);
  assert.doesNotMatch(f.element("seats").innerHTML, /CONTROLLER 4/);
});
test("team lobby requires two sides, then produces the team winner", () => {
  const f = fixture();
  f.press("Enter");
  f.press("Digit1");
  f.press("Digit3");
  f.element("mode").click();
  assert.equal(f.element("launch").disabled, true);
  const seatButton = { dataset: { seat: "2", action: "team" } };
  f.element("seats").click({ target: { closest: () => seatButton } });
  assert.equal(f.element("launch").disabled, false);
  f.press("Enter");
  f.advance(3.2);
  assert.equal(f.match.mode, "teams");
  f.match.players[1].lives = 0;
  f.match.players[1].alive = false;
  f.advance(1.7);
  assert.match(f.element("winner-title").textContent, /Sun team wins/);
});
test("blur releases keyboard input and freezes the simulation", () => {
  const f = fixture();
  f.press("Enter");
  f.press("Digit1");
  f.element("add-bot").click();
  f.press("Enter");
  f.advance(3.2);
  f.key("KeyD");
  f.advance(0.3);
  f.listeners.get("blur")();
  const time = f.match.time;
  f.advance(1);
  assert.equal(f.match.time, time);
  f.press("Enter");
  const speed = f.match.players[0].vx;
  f.advance(0.1);
  assert.ok(f.match.players[0].vx < speed);
});

test("golden feather announces the cap or restored life accurately", () => {
  for (const lives of [4, 5]) {
    const f = fixture();
    f.press("Enter");
    f.press("Digit1");
    f.press("Digit2");
    f.press("Enter");
    f.advance(3.2);
    const player = f.match.players[0];
    player.lives = lives;
    f.match.pickup = { x: player.x, y: player.y, ttl: 10 };
    f.advance();
    assert.equal(player.lives, 5);
    assert.equal(f.match.pickup, null);
    assert.equal(
      f.element("announcement").textContent,
      lives === 5 ? "EMBER (P1) MAX LIVES REACHED" : "EMBER (P1) +1 LIFE",
    );
  }
});

test("rebirth sound fires once at respawn, after the death delay", () => {
  const f = fixture();
  f.press("Enter");
  f.press("Digit1");
  f.press("Digit2");
  f.press("Enter");
  f.advance(3.2);
  assert.equal(f.soundEvents.filter((k) => k === "spawn").length, 0);
  f.match.players[0].invincible = 0;
  f.match.kill(f.match.players[0]);
  f.advance(2.4);
  assert.equal(f.soundEvents.filter((k) => k === "death").length, 1);
  assert.equal(f.soundEvents.filter((k) => k === "spawn").length, 0);
  f.advance(0.3);
  assert.equal(f.soundEvents.filter((k) => k === "spawn").length, 1);
  f.advance(0.3);
  assert.equal(f.soundEvents.filter((k) => k === "spawn").length, 1);
});

test("final feather burst remains visible before results and its delay pauses", () => {
  const f = fixture();
  f.press("Enter");
  f.press("Digit1");
  f.press("Digit2");
  f.press("Enter");
  f.advance(3.2);
  const victim = f.match.players[1];
  victim.lives = 1;
  victim.invincible = 0;
  f.match.kill(victim, f.match.players[0]);
  f.advance();
  assert.equal(f.soundEvents.filter((k) => k === "death").length, 1);
  assert.equal(f.element("results").hidden, true);
  assert.equal(f.element("hud").hidden, false);
  const matchTime = f.match.time;
  const positions = f.match.players.map((p) => [p.x, p.y, p.lives]);
  f.press("Enter");
  f.key("KeyW");
  f.advance(1);
  assert.equal(f.element("results").hidden, true);
  assert.equal(f.match.time, matchTime);
  assert.deepEqual(
    f.match.players.map((p) => [p.x, p.y, p.lives]),
    positions,
  );
  f.press("Escape");
  f.advance(2);
  assert.equal(f.element("pause").hidden, false);
  assert.equal(f.element("results").hidden, true);
  f.press("Enter");
  f.advance(0.4);
  assert.equal(f.element("results").hidden, true);
  f.advance(0.3);
  assert.equal(f.element("results").hidden, false);
  f.press("Enter");
  assert.ok(f.match.players.every((p) => p.lives === 5));
});

test("flap sound follows the selected character rather than the keyboard seat", () => {
  const f = fixture();
  f.press("Enter");
  f.press("Digit1");
  f.press("KeyD");
  f.press("Digit2");
  f.press("Enter");
  f.advance(3.2);
  assert.equal(f.match.players[0].character, 1);
  f.press("KeyW");
  f.advance();
  f.press("ArrowUp");
  f.advance();
  const flaps = f.soundCalls.filter((call) => call.kind === "flap");
  assert.deepEqual(
    flaps.map((call) => call.variant),
    Array.from(f.match.players, (p) => p.character),
  );
});

test("holding keyboard flap repeats at a steady cadence and releasing stops it", () => {
  const f = fixture();
  f.press("Enter");
  f.press("Digit1");
  f.press("Digit2");
  f.press("Enter");
  f.advance(3.2);
  f.key("KeyW");
  f.advance(0.72);
  assert.equal(
    f.soundCalls.filter((s) => s.kind === "flap" && s.variant === 0).length,
    4,
  );
  f.release("KeyW");
  f.advance(0.5);
  assert.equal(
    f.soundCalls.filter((s) => s.kind === "flap" && s.variant === 0).length,
    4,
  );
});

test("keyboard dive, boost meter, cooldown, and pause share the real input path", () => {
  const f = fixture();
  f.press("Enter");
  f.press("Digit1");
  f.press("Digit2");
  f.press("Enter");
  f.advance(3.2);
  const p = f.match.players[0];
  Object.assign(p, { x: 700, y: 850, grounded: false, vx: 100, vy: 0 });
  f.key("KeyS");
  f.advance();
  assert.equal(p.vx, 0);
  assert.ok(p.vy > 580);
  f.release("KeyS");
  f.key("KeyE");
  f.advance();
  assert.equal(p.boostCharge, 0);
  assert.equal(Math.abs(p.vx), 650);
  f.advance(0.2);
  assert.match(f.element("players-hud").innerHTML, /role="progressbar"/);
  f.press("Escape");
  const charge = p.boostCharge;
  f.advance(5);
  assert.equal(p.boostCharge, charge);
  f.press("Enter");
  f.advance(4);
  assert.equal(p.boostCharge, 1);

  assert.equal(p.boostTime, 0);
});

test("controller alone navigates menus, adds a bot, chooses teams and pauses", () => {
  const f = fixture(),
    pad = f.pad(0);
  f.button(pad, 9); // join
  f.button(pad, 13); // ready
  f.button(pad, 13); // mode
  assert.equal(f.element("mode").attributes["data-pad-focus"], "P1");
  f.button(pad, 0); // teams
  assert.match(f.element("seats").innerHTML, /SUN TEAM/);
  f.button(pad, 13); // add bot
  f.button(pad, 0);
  assert.match(f.element("seats").innerHTML, /PRACTICE BOT/);
  assert.match(f.element("seats").innerHTML, /MOON TEAM/);
  f.button(pad, 9);
  f.advance(3.2);
  assert.equal(f.match.mode, "teams");
  const p = f.match.players[0];
  pad.buttons[0].pressed = true;
  f.advance(0.7);
  pad.buttons[0].pressed = false;
  f.advance();
  assert.ok(
    f.soundCalls.filter((s) => s.kind === "flap" && s.variant === 0).length >=
      3,
  );
  f.button(pad, 9);
  assert.equal(f.element("pause").hidden, false);
  f.button(pad, 13); // sound
  assert.equal(f.element("pause-sound").attributes["data-pad-focus"], "SELECT");
  let soundSelected = false;
  const toggleSound = f.element("pause-sound").onclick;
  f.element("pause-sound").onclick = () => {
    soundSelected = true;
    toggleSound();
  };
  f.button(pad, 0);
  assert.equal(soundSelected, true);
  f.button(pad, 13);
  f.button(pad, 13); // quit
  f.button(pad, 0);
  assert.equal(f.element("lobby").hidden, false);
});

test("all four players may independently select the same mount", () => {
  const f = fixture(),
    pads = [0, 1, 2, 3].map((i) => f.pad(i));
  for (const p of pads) f.button(p, 9);
  for (let i = 1; i < 4; i++) for (let n = 0; n < i; n++) f.button(pads[i], 14);
  for (const p of pads) f.button(p, 9);
  f.advance(3.2);
  assert.ok(f.match.players.every((p) => p.character === 0));
  for (let i = 1; i <= 4; i++)
    assert.ok(f.element("players-hud").innerHTML.includes(`EMBER (P${i})`));
  for (let i = 1; i < 4; i++) {
    f.match.players[i].alive = false;
    f.match.players[i].lives = 0;
  }
  f.advance(1.7);
  assert.equal(f.element("winner-title").textContent, "EMBER (P1) wins!");
  f.button(pads[0], 13);
  f.button(pads[0], 0);
  assert.equal(f.element("lobby").hidden, false);
});

test("holding boost on a controller never retriggers after recharge", () => {
  const f = fixture(),
    pad = f.pad(0),
    other = f.pad(1);
  f.button(pad, 9);
  f.button(other, 9);
  f.button(pad, 9);
  f.button(other, 9);
  f.advance(3.2);
  const p = f.match.players[0];
  Object.assign(p, { x: 700, y: 850, vx: 0, vy: 0, grounded: false });
  pad.buttons[2].pressed = true;
  f.advance();
  assert.equal(p.boostCharge, 0);
  assert.equal(Math.abs(p.vx), 650);
  f.advance(4);
  assert.equal(p.boostCharge, 1);
  assert.equal(p.boostTime, 0);
  pad.buttons[2].pressed = false;
  f.advance();
  f.button(pad, 2);
  assert.equal(p.boostCharge, 0);
  pad.buttons[13].pressed = true;
  Object.assign(p, { x: 700, y: 850, grounded: false });
  f.advance();
  assert.equal(p.vx, 0);
  assert.ok(p.vy > 580);
});
