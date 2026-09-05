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
        setAttribute() {},
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
  class RecordedAudio extends require("../audio.js") {
    play(kind, variant) {
      soundEvents.push(kind);
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
  assert.match(f.element("winner-title").textContent, /takes the sky/);
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
  // Occupied characters swap rather than locking the picker with four seats.
  pads[0].axes[0] = 1;
  f.advance();
  pads[0].axes[0] = 0;
  f.advance();
  for (const p of pads) f.button(p, 9);
  f.advance(3.2);
  assert.equal(f.match.players.length, 4);
  assert.equal(f.match.players[0].character, 1);
  assert.equal(f.match.players[1].character, 0);
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
      lives === 5 ? "EMBER MAX LIVES REACHED" : "EMBER +1 LIFE",
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
