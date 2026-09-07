const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Match, ARENAS, botInput } = require("../engine.js");
const arena = ARENAS.find((a) => a.id === "swamp");
function make() {
  const m = new Match(
    [{ character: 7 }, { character: 0 }],
    "ffa",
    () => 0.5,
    arena,
  );
  m.nextPower = m.nextLife = m.nextPiranha = 999;
  m.players.forEach((p, i) =>
    Object.assign(p, {
      x: 100 + i * 1720,
      y: 948,
      vx: 0,
      vy: 0,
      grounded: true,
      invincible: 99,
    }),
  );
  return m;
}
function tick(m, n = 1, inputs = []) {
  for (let i = 0; i < n; i++) m.step(1 / 120, inputs);
}
test("swamp retains mirrored banks and safe spawns with open lethal water", () => {
  const m = make();
  assert.equal(arena.platforms.filter((p) => p.ground).length, 0);
  assert.equal(arena.platforms.filter((p) => p.bank).length, 2);
  assert.equal(m.overWater(960), true);
  assert.equal(m.overWater(100), false);
  assert.equal(m.overWater(1820), false);
  for (let n = 0; n < 30; n++) {
    m.spawn(m.players[0]);
    assert.ok(m.players[0].y < 900);
  }
});
test("falling or diving into water kills once without KO credit; banks remain safe", () => {
  for (const dive of [false, true]) {
    const m = make(),
      p = m.players[0];
    Object.assign(p, {
      x: 700,
      y: 940,
      vy: 500,
      grounded: false,
      invincible: 0,
    });
    tick(m, 5, [{ dive }]);
    assert.equal(p.alive, false);
    assert.equal(p.lives, 4);
    assert.equal(m.events.filter((e) => e.type === "death").length, 1);
    assert.equal(m.events.find((e) => e.type === "death").cause, "water");
    assert.ok(m.players.every((p) => p.kills === 0));
    assert.equal(m.players[1].alive, true);
  }
});
test("sawblades also die on water and respawn protection cannot leave players stuck below the screen", () => {
  const m = make(),
    p = m.players[0];
  m.equip(p, "sawblade");
  Object.assign(p, { x: 700, y: 940, vx: 0, vy: 560, invincible: 0 });
  tick(m, 5);
  assert.equal(p.alive, false);
  m.spawn(p);
  Object.assign(p, { x: 700, y: 970, grounded: false, vy: 500 });
  tick(m);
  assert.equal(p.alive, true);
  assert.ok(p.y < 960);
  assert.ok(p.vy < 0);
});
test("piranhas require a nearby rider over water, warn first, jump vertically and return to water", () => {
  const m = make();
  m.nextPiranha = 0;
  tick(m, 400);
  assert.equal(m.piranhas.length, 0);
  Object.assign(m.players[0], { x: 960, y: 895, vy: 0, grounded: false });
  tick(m);
  assert.equal(m.piranhas.length, 1);
  const f = m.piranhas[0],
    x = f.x;
  assert.ok(f.warning > 0);
  tick(m, 12);
  assert.equal(f.y, 960, "ripple briefly warns before takeoff");
  tick(m, 36);
  assert.equal(f.warning, 0);
  assert.ok(
    f.y < 910 && f.y > 880,
    "fish reaches a nearby rider in about 0.4 seconds",
  );
  assert.equal(f.x, x);
  assert.ok(f.y < 960);
  assert.ok(f.vy < 0);
  Object.assign(m.players[0], { x: 100, y: 948, grounded: true, vy: 0 });
  m.nextPiranha = 999;
  tick(m, 230);
  assert.equal(m.piranhas.length, 0);
  assert.equal(m.events.filter((e) => e.type === "splash").length, 2);
});
test("jumping fish sweep kills players and respects spawn protection", () => {
  for (const protection of [0, 99]) {
    const m = make(),
      p = m.players[0];
    Object.assign(p, {
      x: 700,
      y: 910,
      invincible: protection,
      grounded: false,
    });
    m.piranhas.push({ x: 700, y: 949, vy: -570, warning: 0, alive: true });
    tick(m, 8);
    assert.equal(p.alive, protection > 0);
    if (!protection)
      assert.equal(m.events.find((e) => e.type === "death").cause, "piranha");
  }
});
test("water survives walking off either bank and bot emergency input climbs away", () => {
  for (const side of [-1, 1]) {
    const m = make(),
      p = m.players[0];
    Object.assign(p, {
      x: side === 1 ? 209 : 1711,
      y: 948,
      vx: side * 200,
      invincible: 0,
    });
    tick(m, 20, [{ move: side }]);
    assert.equal(p.alive, false);
  }
  const m = make(),
    p = m.players[0];
  Object.assign(p, { x: 960, y: 900, grounded: false, botDive: true });
  const input = botInput(p, m, 1 / 120);
  assert.equal(input.flapHeld, true);
  assert.equal(input.flap, false);
  assert.equal(input.dive, false);
});

test("bot water escape uses held-flap cadence instead of flapping on every simulation step", () => {
  const m = make(),
    p = m.players[0];
  Object.assign(p, { x: 960, y: 900, grounded: false, flapCooldown: 0.1 });
  const input = botInput(p, m, 1 / 120);
  tick(m, 1, [input]);
  assert.equal(m.events.filter((e) => e.type === "flap").length, 0);
  tick(m, 15, [input]);
  assert.equal(m.events.filter((e) => e.type === "flap").length, 1);
});

test("water arenas exclude sawblades from both normal and debug power spawns", () => {
  for (const debug of [false, true]) {
    const water = make();
    const dry = new Match([{ character: 0 }, { character: 1 }]);
    const wetKinds = new Set(),
      dryKinds = new Set();
    for (let i = 0; i < 100; i++) {
      water.rng = dry.rng = () => i / 100;
      water.spawnPower(debug);
      dry.spawnPower(debug);
      wetKinds.add(water.powerPickup.kind);
      dryKinds.add(dry.powerPickup.kind);
    }
    assert.deepEqual([...wetKinds].sort(), ["flame", "rocket"]);
    assert.deepEqual([...dryKinds].sort(), ["flame", "rocket", "sawblade"]);
  }
});
