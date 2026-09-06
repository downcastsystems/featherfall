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
test("graves only exist on the ruins and emit one zombie per appearance with a cap", () => {
  for (const a of ARENAS) {
    const m = new Match(
      [{ character: 0 }, { character: 1 }],
      "ffa",
      () => 0.5,
      a,
    );
    assert.equal(m.graves.length, a === arena ? 4 : 0);
    m.spawnZombies();
    assert.equal(m.zombies.length, a === arena ? 1 : 0);
    if (a !== arena) continue;
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
test("bursts have no area damage and old zombies are removed", () => {
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
  const rolls = [0, 0.9, 0.3, 0.1];
  m.rng = () => rolls.shift() ?? 0.5;
  m.spawnZombies();
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

test("zombies independently choose any grave and either direction without mirrored pairing", () => {
  const m = make();
  const rolls = [0.1, 0.1, 0.1, 0.1, 0.6, 0.9, 0.9, 0.1];
  m.rng = () => rolls.shift();
  m.spawnZombies();
  m.spawnZombies();
  assert.equal(m.zombies[0].x, m.graves[0].x);
  assert.equal(m.zombies[1].x, m.graves[0].x);
  assert.equal(m.zombies[0].vx, -72);
  assert.equal(m.zombies[1].vx, -72);
  m.spawnZombies();
  m.spawnZombies();
  assert.equal(m.zombies[2].x, m.graves[2].x);
  assert.equal(m.zombies[2].vx, 72);
  assert.equal(m.zombies[3].x, m.graves[3].x);
  assert.equal(m.zombies[3].vx, -72);
  assert.equal(rolls.length, 0);
});

test("occupied graves are skipped and a fully occupied graveyard spawns nothing", () => {
  const m = make();
  const g = m.graves[0];
  Object.assign(m.players[0], { x: g.x, y: g.y - 12, alive: true });
  m.rng = () => 0;
  m.spawnZombies();
  assert.ok(m.zombies.every((z) => z.x !== g.x || z.y !== g.y));
  const full = new Match(
    Array.from({ length: 4 }, (_, character) => ({ character })),
    "ffa",
    () => 0.5,
    arena,
  );
  full.players.forEach((p, i) =>
    Object.assign(p, {
      x: full.graves[i].x,
      y: full.graves[i].y - 12,
      alive: true,
    }),
  );
  full.spawnZombies();
  assert.equal(full.zombies.length, 0);
  full.players[0].alive = false;
  full.spawnZombies();
  assert.equal(full.zombies.length, 1);
  assert.ok(full.zombies.every((z) => z.x === full.graves[0].x));
});
test("walking onto a grave during emergence cancels its zombie without hurting the player", () => {
  const m = make(),
    g = m.graves[0];
  m.rng = () => 0;
  m.spawnZombies();
  Object.assign(m.players[0], {
    x: g.x,
    y: g.y - 12,
    invincible: 0,
    vx: 0,
    vy: 0,
  });
  tick(m);
  assert.equal(m.zombies.length, 0);
  assert.equal(m.players[0].alive, true);
  assert.equal(m.events.filter((e) => e.type === "zombie-pop").length, 0);
});
test("walking and falling zombies wrap both edges without reversing or losing fall height", () => {
  for (const direction of [-1, 1])
    for (const grounded of [true, false]) {
      const m = make(),
        z = zombie(m, {
          x: direction > 0 ? 1919.8 : 0.2,
          y: grounded ? 1010 : 600,
          vx: direction * 72,
          vy: grounded ? 0 : 200,
          grounded,
          fallFrom: 230,
        });
      tick(m);
      assert.ok(direction > 0 ? z.x < 1 : z.x > 1919);
      assert.equal(z.alive, true);
      assert.equal(z.vx, direction * 72);
      assert.equal(z.grounded, grounded);
      assert.equal(z.fallFrom, 230);
    }
});
test("wrapping zombies hit players at the seam without sweeping across the whole arena", () => {
  const m = make();
  Object.assign(m.players[0], { x: 3, invincible: 0 });
  Object.assign(m.players[1], { x: 960, invincible: 0 });
  zombie(m, { x: 1919.8, vx: 72 });
  tick(m);
  assert.equal(m.players[0].alive, false);
  assert.equal(m.players[1].alive, true);
});
test("a falling zombie can cross the seam and land on the ground normally", () => {
  const m = make(),
    z = zombie(m, {
      x: 1919.8,
      y: 1009,
      vx: 72,
      vy: 200,
      grounded: false,
      fallFrom: 800,
    });
  tick(m);
  assert.ok(z.x < 1);
  assert.equal(z.y, 1010);
  assert.equal(z.grounded, true);
  assert.equal(z.alive, true);
});

test("scheduled appearances emit one zombie at a time with independently randomized gaps", () => {
  const m = make();
  m.nextZombie = 0;
  for (const roll of [0.1, 0.9, 0.3]) {
    m.rng = () => roll;
    m.time = m.nextZombie;
    const count = m.nextZombieId;
    tick(m);
    assert.equal(m.nextZombieId, count + 1);
    assert.ok(Math.abs(m.nextZombie - m.time - (2 + roll * 3)) < 0.001);
    tick(m, 120);
    assert.equal(m.nextZombieId, count + 1);
  }
});
