const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Match, ARENAS } = require("../engine.js");
function make() {
  return new Match(
    [{ character: 0 }, { character: 1 }],
    "ffa",
    () => 0.5,
    ARENAS.find((a) => a.id === "factory"),
  );
}
test("factory ceiling saws are mirrored and kill on swept contact without KO credit", () => {
  const m = make();
  for (const s of m.arena.saws)
    assert.ok(m.arena.saws.some((q) => q.x === 1920 - s.x && q.y === s.y));
  const p = m.players[0];
  Object.assign(p, { x: 180, y: 280, invincible: 0 });
  const before = m.players.map((p) => ({ ...p }));
  p.y = 120;
  m.stepFactory(before);
  assert.equal(p.alive, false);
  assert.equal(m.players[1].kills, 0);
  assert.equal(m.events.find((e) => e.type === "death").cause, "factory");
});
test("sawblade power bounces safely off a ceiling saw", () => {
  const m = make(),
    p = m.players[0];
  m.equip(p, "sawblade");
  Object.assign(p, { x: 180, y: 245, vx: 0, vy: -560, invincible: 0 });
  const before = m.players.map((p) => ({ ...p }));
  p.y = 220;
  m.stepFactory(before);
  assert.equal(p.alive, true);
  assert.equal(p.vy, 560);
  assert.ok(p.y > 225);
  assert.equal(m.events.filter((e) => e.type === "saw-clang").length, 1);
  const after = m.players.map((p) => ({ ...p }));
  p.y += 6;
  m.stepFactory(after);
  assert.equal(m.events.filter((e) => e.type === "saw-clang").length, 1);
});
test("respawn protection blocks saw deaths and a near miss remains safe", () => {
  const m = make(),
    p = m.players[0];
  Object.assign(p, { x: 180, y: 190, invincible: 2 });
  m.stepFactory(m.players.map((p) => ({ ...p })));
  assert.equal(p.alive, true);
  Object.assign(p, { x: 310, y: 260, invincible: 0 });
  m.stepFactory(m.players.map((p) => ({ ...p })));
  assert.equal(p.alive, true);
});

test("powered saw cannot get trapped between ceiling and factory saw", () => {
  const m = make(),
    p = m.players[0];
  m.equip(p, "sawblade");
  Object.assign(p, { x: 180, y: 120, vx: 900, vy: -560, invincible: 0 });
  m.stepFactory(m.players.map((p) => ({ ...p })));
  assert.ok(p.y > 225);
  assert.ok(p.vy > 0);
  assert.equal(p.alive, true);
});

test("ceiling saws overlap across the entire width and both wrap edges", () => {
  const m = make(),
    saws = m.arena.saws;
  assert.ok(saws[0].x - saws[0].radius <= 0);
  assert.ok(saws.at(-1).x + saws.at(-1).radius >= 1920);
  for (let i = 1; i < saws.length; i++)
    assert.ok(saws[i].x - saws[i - 1].x < saws[i].radius * 1.4);
  for (const x of [0, 24, 180, 960, 1896, 1919]) {
    const n = make(),
      p = n.players[0];
    n.equip(p, "sawblade");
    Object.assign(p, { x, y: 180, vx: 900, vy: -560, invincible: 0 });
    n.stepFactory(n.players.map((p) => ({ ...p })));
    assert.equal(p.alive, true);
    assert.ok(p.y > 230);
    assert.ok(p.vy > 0);
    assert.equal(n.events.filter((e) => e.type === "saw-clang").length, 1);
  }
});

test("bots brake upward momentum before the saw ceiling and refuse unsafe flaps", () => {
  const { botInput } = require("../engine.js");
  for (const [y, vy] of [
    [280, -350],
    [240, 0],
    [300, -100],
  ]) {
    const m = make(),
      p = m.players[0];
    Object.assign(p, { x: 500, y, vy, grounded: false, botClock: 0 });
    Object.assign(m.players[1], { x: 520, y: 130, invincible: 0 });
    const input = botInput(p, m, 1 / 120);
    assert.equal(input.flap, false);
    if (y === 280) assert.equal(input.dive, true);
  }
});
test("bots can still climb from safe altitudes and survive chasing a ceiling target", () => {
  const { botInput } = require("../engine.js");
  const m = make(),
    p = m.players[0];
  Object.assign(p, {
    x: 600,
    y: 500,
    vy: 0,
    grounded: false,
    botClock: 0,
    invincible: 0,
  });
  Object.assign(m.players[1], { x: 650, y: 130, invincible: 99 });
  m.powerPickup = { x: 620, y: 130, kind: "flame", ttl: 99 };
  assert.equal(botInput(p, m, 1 / 120).flap, true);
  for (let i = 0; i < 600; i++) {
    m.step(1 / 120, [botInput(p, m, 1 / 120)]);
  }
  assert.equal(
    m.events.filter(
      (e) => e.type === "death" && e.id === p.id && e.cause === "factory",
    ).length,
    0,
  );
});
