const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Match, ARENAS } = require("../engine.js");
function make(id = "frost") {
  const m = new Match(
    [{ character: 0 }, { character: 1 }],
    "ffa",
    () => 0.5,
    ARENAS.find((a) => a.id === id),
  );
  m.players.forEach((p, i) =>
    Object.assign(p, { x: 100 + i * 1700, y: 950, invincible: 99 }),
  );
  return m;
}
function snow(m, dt = 1 / 120) {
  m.time += dt;
  m.stepSnow(
    dt,
    m.players.map((p) => ({ ...p })),
  );
}
test("only snow arena spawns one stationary yeti, warns, pushes, and retreats", () => {
  const m = make();
  m.nextYeti = 0;
  snow(m);
  assert.equal(m.yetis.length, 1);
  const x = m.yetis[0].x;
  for (let i = 0; i < 100; i++) snow(m);
  assert.equal(m.snowballs.length, 0);
  assert.equal(m.yetis[0].x, x);
  for (let i = 0; i < 50; i++) snow(m);
  assert.equal(m.snowballs.length, 1);
  for (let i = 0; i < 150; i++) snow(m);
  assert.equal(m.yetis.length, 0);
  const other = make("hollow");
  other.nextYeti = 0;
  snow(other);
  assert.equal(other.yetis.length, 0);
});
test("snowballs roll off platforms, land on lower platforms and burst on ground", () => {
  const m = make();
  m.nextYeti = 999;
  m.snowballs.push({ x: 1100, y: 185, vx: 155, vy: 0, angle: 0 });
  for (let i = 0; i < 120; i++) snow(m);
  assert.ok(m.snowballs[0].y > 185);
  for (let i = 0; i < 2400; i++) snow(m);
  assert.equal(m.snowballs.length, 0);
  assert.ok(m.events.some((e) => e.type === "snow-pop"));
});
test("snowball contact kills without KO credit but respects respawn protection", () => {
  const m = make();
  m.nextYeti = 999;
  const p = m.players[0];
  Object.assign(p, { x: 500, y: 500, invincible: 0 });
  m.snowballs.push({ x: 500, y: 500, vx: 155, vy: 0, angle: 0 });
  snow(m);
  assert.equal(p.alive, false);
  assert.equal(m.players[1].kills, 0);
  const q = m.players[1];
  Object.assign(q, { x: 500, y: 500 });
  snow(m);
  assert.equal(q.alive, true);
});
test("a player approaching an emerging yeti cancels its snowball release", () => {
  const m = make();
  m.nextYeti = 0;
  snow(m);
  const y = m.yetis[0];
  Object.assign(m.players[0], { x: y.x, y: y.y - 12 });
  for (let i = 0; i < 160; i++) snow(m);
  assert.equal(m.snowballs.length, 0);
});
test("snowballs wrap horizontally and fresh matches clear hazards", () => {
  const m = make();
  m.nextYeti = 999;
  m.snowballs.push({ x: 1919, y: 600, vx: 155, vy: 0, angle: 0 });
  snow(m);
  assert.ok(m.snowballs[0].x < 2);
  assert.equal(make().snowballs.length, 0);
});
