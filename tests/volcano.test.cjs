const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Match, ARENAS } = require("../engine.js");
function make(id = "volcanic") {
  const m = new Match(
    [{ character: 0 }, { character: 1 }],
    "ffa",
    () => 0.5,
    ARENAS.find((a) => a.id === id),
  );
  m.nextPower = m.nextLife = 999;
  m.players.forEach((p, i) =>
    Object.assign(p, { x: 500 + i * 900, y: 998, invincible: 999 }),
  );
  return m;
}
const tick = (m, n = 1) => {
  for (let i = 0; i < n; i++) m.step(1 / 120);
};
test("eruption warns before nine drops spaced a second apart, sweeping either direction", () => {
  for (const roll of [0, 0.9]) {
    const m = make();
    m.rng = () => roll;
    m.nextEruption = 0;
    tick(m);
    assert.equal(
      m.events.filter((e) => e.type === "eruption-warning").length,
      1,
    );
    assert.equal(m.volcanoFireballs.length, 0);
    const xs = [];
    for (let column = 0; column < 9; column++) {
      m.time = m.eruption.start + 1.2 + column;
      tick(m);
      xs.push(m.volcanoFireballs.at(-1).x);
      const count = m.eruption?.dropped;
      if (column < 8) {
        tick(m, 60);
        assert.equal(m.eruption.dropped, count);
      }
    }
    assert.deepEqual(
      xs,
      Array.from({ length: 9 }, (_, i) => 100 + 215 * (roll === 0 ? i : 8 - i)),
    );
    assert.equal(m.eruption.dropped, 9);
    while (m.volcanoFireballs.length) tick(m);
    assert.equal(m.eruption, null);
    assert.ok(Math.abs(m.nextEruption - m.time - (8 + roll * 6)) < 0.001);
  }
});
test("rain is restricted to the volcano and fresh rounds have no old fireballs", () => {
  for (const a of ARENAS) {
    const m = make(a.id);
    m.nextEruption = 0;
    tick(m, 160);
    assert.equal(
      m.events.some((e) => e.type === "eruption-warning"),
      a.id === "volcanic",
    );
  }
  assert.equal(make().volcanoFireballs.length, 0);
});
test("fireballs explode at the first platform, sheltering players underneath without splash damage", () => {
  const m = make(),
    p = m.players[0];
  Object.assign(p, { x: 200, y: 290, invincible: 0, grounded: false });
  m.volcanoFireballs.push({ x: 200, y: 220, vy: 760 });
  tick(m, 4);
  assert.equal(m.volcanoFireballs.length, 0);
  assert.equal(p.alive, true);
  assert.equal(m.events.filter((e) => e.type === "volcano-impact").length, 1);
});
test("falling fireballs kill on swept contact, respect protection, and give no KOs", () => {
  for (const protectedPlayer of [false, true]) {
    const m = make(),
      p = m.players[0];
    Object.assign(p, {
      x: 400,
      y: 600,
      invincible: protectedPlayer ? 99 : 0,
      grounded: false,
    });
    m.volcanoFireballs.push({ x: 400, y: 555, vy: 760 });
    tick(m, 12);
    assert.equal(p.alive, protectedPlayer);
    assert.ok(m.players.every((p) => p.kills === 0));
    if (!protectedPlayer)
      assert.equal(m.events.find((e) => e.type === "death").cause, "volcano");
  }
});

test("first blast begins at ten seconds and waves cannot overlap even with an overdue timer", () => {
  const m = make();
  tick(m, 1199);
  assert.equal(m.eruption, null);
  tick(m, 2);
  assert.ok(m.eruption);
  const wave = m.eruption;
  m.nextEruption = 0;
  while (wave.dropped < 9) tick(m);
  assert.equal(m.eruption, wave);
  assert.ok(m.volcanoFireballs.length);
  while (m.volcanoFireballs.length) {
    assert.equal(m.eruption, wave);
    tick(m);
    assert.equal(
      m.events.filter((e) => e.type === "eruption-warning").length,
      1,
    );
  }
  assert.equal(m.eruption, null);
  tick(m, 8 * 120);
  assert.equal(m.eruption, null);
  tick(m, 3 * 120 + 1);
  assert.ok(m.eruption);
  assert.notEqual(m.eruption, wave);
  assert.equal(m.events.filter((e) => e.type === "eruption-warning").length, 2);
});
test("an orphaned falling fireball also blocks a new warning until it is gone", () => {
  const m = make();
  m.nextEruption = 0;
  m.volcanoFireballs.push({ x: 200, y: 200, vy: 360 });
  tick(m);
  assert.equal(m.eruption, null);
  while (m.volcanoFireballs.length) tick(m);
  assert.equal(m.eruption, null);
  tick(m);
  assert.ok(m.eruption);
});
