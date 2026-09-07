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
  Object.assign(p, { x: 310, y: 160, invincible: 0 });
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
