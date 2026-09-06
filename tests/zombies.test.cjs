const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Match, ARENAS } = require("../engine.js");
const arena = ARENAS.find((a) => a.id === "crystal");
function make() {
  const m = new Match(
    [{ character: 0 }, { character: 1 }],
    "ffa",
    () => 0.5,
    arena,
  );
  m.nextZombie = m.nextLife = m.nextPower = 999;
  m.players.forEach((p, i) =>
    Object.assign(p, {
      x: 400 + i * 1000,
      y: 998,
      vx: 0,
      vy: 0,
      invincible: 99,
    }),
  );
  return m;
}
function zombie(m, props = {}) {
  const z = {
    id: 0,
    x: 700,
    y: 1010,
    vx: 72,
    vy: 0,
    grounded: true,
    fallFrom: 1010,
    emerge: 0,
    age: 0,
    alive: true,
    ...props,
  };
  m.zombies.push(z);
  return z;
}
const tick = (m, n = 1, inputs = []) => {
  for (let i = 0; i < n; i++) m.step(1 / 120, inputs);
};
test("graves only exist on the ruins and emit balanced mirrored pairs with a cap", () => {
  for (const a of ARENAS) {
    const m = new Match(
      [{ character: 0 }, { character: 1 }],
      "ffa",
      () => 0.5,
      a,
    );
    assert.equal(m.graves.length, a === arena ? 4 : 0);
    m.spawnZombies();
    assert.equal(m.zombies.length, a === arena ? 2 : 0);
    if (a !== arena) continue;
    assert.equal(m.zombies[0].x + m.zombies[1].x, 1920);
    assert.equal(m.zombies[0].vx, -m.zombies[1].vx);
    for (let i = 0; i < 20; i++) m.spawnZombies();
    assert.equal(m.zombies.length, 12);
  }
});
test("zombies emerge, walk off platforms and actually fall rather than sticking to the edge", () => {
  const m = make(),
    z = zombie(m, { x: 339.8, y: 230, fallFrom: 230, emerge: 0.02 });
  tick(m, 2);
  assert.equal(z.x, 339.8);
  tick(m, 20);
  assert.equal(z.grounded, false);
  assert.ok(z.y > 230);
  assert.ok(z.vy > 0);
});
test("short drops survive and continue walking, while two-tier drops burst once", () => {
  const m = make(),
    short = zombie(m, {
      x: 100,
      y: 725,
      grounded: false,
      fallFrom: 515,
      vx: 0,
      vy: 500,
    });
  tick(m, 3);
  assert.equal(short.alive, true);
  assert.equal(short.grounded, true);
  assert.equal(short.y, 730);
  short.vx = 72;
  tick(m, 10);
  assert.ok(short.x > 100);
  const high = zombie(m, {
    id: 1,
    x: 1700,
    y: 725,
    grounded: false,
    fallFrom: 230,
    vx: 0,
    vy: 500,
  });
  tick(m, 3);
  assert.equal(high.alive, false);
  assert.equal(m.events.filter((e) => e.type === "zombie-pop").length, 1);
  tick(m, 5);
  assert.equal(m.events.filter((e) => e.type === "zombie-pop").length, 1);
});
test("walking contact kills a player without crediting another player", () => {
  const m = make(),
    p = m.players[0];
  Object.assign(p, { x: 700, invincible: 0 });
  zombie(m);
  tick(m);
  assert.equal(p.lives, 4);
  assert.equal(p.alive, false);
  assert.ok(m.players.every((p) => p.kills === 0));
  const event = m.events.find((e) => e.type === "death");
  assert.equal(event.attackerId, null);
  assert.equal(event.cause, "zombie");
});
test("a falling zombie kills from above, while stomping or diving destroys it without score", () => {
  const m = make(),
    p = m.players[0];
  Object.assign(p, { x: 700, invincible: 0 });
  zombie(m, { y: 958, grounded: false, fallFrom: 500, vy: 650, vx: 0 });
  tick(m, 8);
  assert.equal(p.alive, false);
  for (const dive of [false, true]) {
    const m = make(),
      p = m.players[0];
    Object.assign(p, {
      x: 700,
      y: 980,
      vy: 520,
      invincible: 0,
      grounded: false,
    });
    const stats = { ...p.stats };
    const z = zombie(m, { vx: 0 });
    tick(m, 1, [{ dive }]);
    assert.equal(z.alive, false);
    assert.equal(p.alive, true);
    assert.ok(p.vy < 0);
    assert.equal(p.kills, 0);
    assert.equal(p.stats.powerKOs, stats.powerKOs);
    assert.equal(p.stats.diveKOs, stats.diveKOs);
  }
});
test("spawn protection blocks hazards, emerging zombies are harmless, sawblades and fire destroy them", () => {
  const m = make(),
    p = m.players[0];
  Object.assign(p, { x: 700 });
  const z = zombie(m);
  tick(m);
  assert.equal(p.alive, true);
  assert.equal(z.alive, true);
  p.invincible = 0;
  z.emerge = 0.5;
  tick(m);
  assert.equal(p.alive, true);
  z.emerge = 0;
  m.equip(p, "sawblade");
  tick(m);
  assert.equal(z.alive, false);
  assert.equal(p.alive, true);
  assert.equal(p.kills, 0);
  const f = make(),
    q = f.players[0];
  Object.assign(q, { x: 700 });
  f.equip(q, "flame");
  const point = f.fireballs(q)[0];
  const target = zombie(f, { x: point.x, y: point.y + 8, vx: 0 });
  tick(f);
  assert.equal(target.alive, false);
  assert.equal(q.kills, 0);
});
test("bursts have no area damage and old or offscreen zombies are removed", () => {
  const m = make(),
    p = m.players[0];
  Object.assign(p, { x: 730, invincible: 0 });
  zombie(m, {
    x: 700,
    y: 1008,
    grounded: false,
    fallFrom: 500,
    vy: 650,
    vx: 0,
  });
  tick(m);
  assert.equal(m.zombies.length, 0);
  assert.equal(p.alive, true);
  zombie(m, { age: 41 });
  zombie(m, { id: 1, x: -20 });
  tick(m);
  assert.equal(m.zombies.length, 0);
});
test("simultaneous final zombie deaths produce a draw and a new round has no old hazards", () => {
  const m = make();
  m.players.forEach((p, i) => {
    Object.assign(p, { x: 700 + i * 500, lives: 1, invincible: 0 });
    zombie(m, { id: i, x: p.x });
  });
  tick(m);
  assert.equal(m.winner.draw, true);
  assert.ok(m.players.every((p) => p.kills === 0));
  assert.equal(make().zombies.length, 0);
});

test("naturally spawned zombies survive a first ledge and eventually splat after a larger drop", () => {
  const m = make();
  m.spawnZombies();
  let shortLanding = false;
  for (let i = 0; i < 2400; i++) {
    tick(m);
    if (m.zombies.some((z) => z.grounded && z.y === 515)) shortLanding = true;
  }
  assert.equal(shortLanding, true);
  assert.equal(
    m.events.filter((e) => e.type === "zombie-pop" && e.reason === "fall")
      .length,
    2,
  );
});
