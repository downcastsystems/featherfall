const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ARENAS, ArenaRotation, Match, W, botInput } = require("../engine.js");
const seats = Array.from({ length: 4 }, (_, character) => ({
  character,
  kind: "bot",
  team: character % 2,
}));
const make = (arena) => new Match(seats, "ffa", () => 0.5, arena);
test("seven distinct arenas have mirrored, separated, playable platform layouts", () => {
  assert.equal(ARENAS.length, 7);
  assert.equal(new Set(ARENAS.map((a) => JSON.stringify(a.platforms))).size, 7);
  assert.equal(new Set(ARENAS.map((a) => a.motif)).size, 7);
  for (const arena of ARENAS) {
    const platforms = arena.platforms;
    assert.equal(
      platforms.filter((p) => p.ground).length,
      arena.waterY === undefined ? 1 : 0,
    );
    for (const p of platforms) {
      assert.ok(p.x >= 0 && p.x + p.w <= W && p.w >= 180, arena.name);
      assert.ok(
        platforms.some(
          (q) => q.x === W - p.x - p.w && q.y === p.y && q.w === p.w,
        ),
        arena.name,
      );
      for (const q of platforms) {
        if (p === q) continue;
        assert.ok(
          p.x + p.w + 20 <= q.x ||
            q.x + q.w + 20 <= p.x ||
            Math.abs(p.y - q.y) >= 100,
          arena.name,
        );
      }
    }
  }
});
test("rotation exhausts every arena before repeating and never repeats at the cycle seam", () => {
  for (const rng of [() => 0, () => 0.999, () => 0.5]) {
    const rotation = new ArenaRotation(rng);
    let last;
    for (let cycle = 0; cycle < 8; cycle++) {
      const batch = Array.from({ length: 7 }, () => rotation.next());
      assert.equal(new Set(batch).size, 7);
      assert.notEqual(batch[0], last);
      last = batch[6];
    }
  }
});
test("spawns, feathers and powers use each match arena independently", () => {
  const matches = ARENAS.map(make);
  for (const m of matches) {
    assert.equal(m.platforms, m.arena.platforms);
    for (const p of m.players) {
      assert.ok(
        m.platforms.some(
          (s) => !s.ground && p.y === s.y - 12 && p.x > s.x && p.x < s.x + s.w,
        ),
      );
    }
    m.spawnPower(true);
    assert.ok(
      m.platforms.some(
        (s) =>
          !s.ground &&
          m.powerPickup.y === s.y - 26 &&
          m.powerPickup.x > s.x &&
          m.powerPickup.x < s.x + s.w,
      ),
    );
    m.nextLife = 0;
    m.step(1 / 120, []);
    assert.ok(m.platforms.some((s) => !s.ground && m.pickup.y === s.y - 26));
  }
});
test("saws bounce on every face of each arena platform and riders land on each platform", () => {
  for (const arena of ARENAS) {
    for (const s of arena.platforms.filter((s) => !s.ground && !s.bank)) {
      for (const [x, y, vx, vy, axis] of [
        [s.x + s.w / 2, s.y - 13, 0, 560, "vy"],
        [s.x + s.w / 2, s.y + 57, 0, -560, "vy"],
        [s.x - 11, s.y + 10, 900, 0, "vx"],
        [s.x + s.w + 11, s.y + 10, -900, 0, "vx"],
      ]) {
        const m = make(arena),
          p = m.players[0];
        m.equip(p, "sawblade");
        Object.assign(p, { x, y, vx, vy, invincible: 99 });
        m.step(1 / 120, []);
        assert.equal(p[axis], -(axis === "vx" ? vx : vy), arena.name);
      }
      const m = make(arena),
        p = m.players[0];
      Object.assign(p, {
        x: s.x + s.w / 2,
        y: s.y - 13,
        vx: 0,
        vy: 560,
        invincible: 99,
      });
      m.step(1 / 120, []);
      assert.equal(p.y, s.y - 12);
      assert.equal(p.grounded, true);
    }
  }
});
test("bots run in every arena with finite movement and valid wrapping", () => {
  for (const arena of ARENAS) {
    const m = make(arena);
    for (let tick = 0; tick < 3600 && !m.winner; tick++) {
      m.step(
        1 / 120,
        m.players.map((p) => botInput(p, m, 1 / 120)),
      );
      for (const p of m.players) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), arena.name);
        assert.ok(p.x >= 0 && p.x < W, arena.name);
      }
    }
    assert.ok(
      m.players.some((p) => p.stats.distance > 1000),
      arena.name,
    );
  }
});
