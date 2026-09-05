const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  Match,
  chooseSpawn,
  PLATFORMS,
  W,
  botInput,
  gamepadState,
  edges,
} = require("../engine.js");
const seats = (n = 2) =>
  Array.from({ length: n }, (_, i) => ({
    character: i,
    team: i % 2,
    kind: "bot",
  }));
const make = (mode = "ffa", n = 2) => new Match(seats(n), mode, () => 0.5);
function position(p, x, y) {
  Object.assign(p, {
    x,
    y,
    vx: 0,
    vy: 0,
    invincible: 0,
    alive: true,
    clash: 0,
  });
}
const tick = (m, n = 1, inputs = []) => {
  for (let i = 0; i < n; i++) m.step(1 / 120, inputs);
};
test("five lives, distinct floating platform spawns and two seconds of protection", () => {
  const m = make("ffa", 4);
  assert.ok(
    m.players.every((p) => p.lives === 5 && p.alive && p.invincible === 2),
  );
  assert.equal(new Set(m.players.map((p) => p.x + ":" + p.y)).size, 4);
  assert.ok(
    m.players.every((p) =>
      PLATFORMS.some((s) => !s.ground && p.y === s.y - 12),
    ),
  );
});
test("spawn maximizes distance from active rivals including wraparound", () => {
  const p = { x: 260, y: 243, alive: true };
  const s = chooseSpawn([p], () => 0.5);
  const dist = (x) =>
    Math.hypot(
      Math.min(Math.abs(x.x - p.x), W - Math.abs(x.x - p.x)),
      x.y - p.y,
    );
  const all = PLATFORMS.filter((p) => !p.ground).map((p) => ({
    x: p.x + p.w / 2,
    y: p.y - 12,
  }));
  assert.equal(dist(s), Math.max(...all.map(dist)));
});
test("higher rider wins and victim loses exactly one life", () => {
  const m = make();
  position(m.players[0], 400, 350);
  position(m.players[1], 400, 368);
  tick(m, 10);
  assert.equal(m.players[1].lives, 4);
  assert.equal(m.players[1].alive, false);
  assert.equal(m.players[0].kills, 1);
  assert.equal(m.winner, null);
});
test("height combat also works across the wrap seam", () => {
  const m = make();
  position(m.players[0], 4, 350);
  position(m.players[1], W - 4, 368);
  tick(m);
  assert.equal(m.players[1].lives, 4);
});
test("equal height contact bounces apart without costing lives", () => {
  const m = make();
  position(m.players[0], 400, 350);
  position(m.players[1], 405, 350);
  tick(m);
  assert.equal(m.players[0].lives, 5);
  assert.equal(m.players[1].lives, 5);
  assert.ok(m.players[0].vx < 0 && m.players[1].vx > 0);
});
test("spawn protection blocks damage and offensive kills", () => {
  for (const index of [0, 1]) {
    const m = make();
    position(m.players[0], 400, 350);
    position(m.players[1], 400, 368);
    m.players[index].invincible = 2;
    tick(m);
    assert.ok(m.players.every((p) => p.lives === 5));
  }
});
test("respawn is delayed and returns with protection", () => {
  const m = make();
  m.players[0].invincible = 0;
  m.kill(m.players[0]);
  tick(m, 240);
  assert.equal(m.players[0].alive, false);
  tick(m, 75);
  assert.equal(m.players[0].alive, true);
  assert.ok(m.players[0].invincible > 1.9);
});
test("elimination never respawns and ends the match", () => {
  const m = make();
  position(m.players[0], 400, 350);
  position(m.players[1], 400, 368);
  m.players[1].lives = 1;
  tick(m);
  assert.equal(m.players[1].lives, 0);
  assert.deepEqual(m.winner, { id: 0, draw: false });
  assert.equal(m.players[1].respawn, 0);
});
test("teams ignore friendly fire and account for pending enemy respawns", () => {
  const m = make("teams", 4);
  position(m.players[0], 400, 350);
  position(m.players[2], 400, 368);
  tick(m);
  assert.equal(m.players[2].lives, 5);
  m.players[1].alive = false;
  m.players[1].respawn = 2;
  m.players[1].lives = 1;
  m.players[3].alive = false;
  m.players[3].lives = 0;
  tick(m);
  assert.equal(m.winner, null);
  m.players[1].lives = 0;
  tick(m);
  assert.deepEqual(m.winner, { team: 0, draw: false });
});
test("platform undersides stop ascent and give a small downward bump", () => {
  const m = make(),
    p = m.players[0];
  position(p, 200, 313);
  p.vy = -360;
  tick(m);
  assert.ok(p.y >= 311);
  assert.ok(p.vy >= 65 && p.vy <= 110);
  assert.equal(p.grounded, false);
  assert.equal(p.lives, 5);
  assert.ok(m.events.some((e) => e.type === "bump"));
});
test("platform tops still catch descent and support walking", () => {
  const m = make(),
    p = m.players[0];
  position(p, 200, 238);
  p.vy = 200;
  tick(m, 5);
  assert.equal(p.y, 243);
  assert.equal(p.grounded, true);
  tick(m, 30, [{ move: 1 }]);
  assert.equal(p.y, 243);
  assert.ok(p.x > 200);
});
test("both platform sides rebound in proportion to impact speed", () => {
  for (const direction of [-1, 1])
    for (const speed of [100, 300]) {
      const m = make(),
        p = m.players[0];
      position(p, direction === 1 ? 129.5 : 390.5, 275);
      p.grounded = false;
      p.vx = direction * speed;
      tick(m);
      assert.ok(direction * p.vx < 0);
      assert.ok(
        Math.abs(Math.abs(p.vx) - speed * Math.exp(-1.2 / 120) * 1.1) < 0.001,
      );
      assert.ok(direction === 1 ? p.x < 130 : p.x > 390);
      assert.equal(p.lives, 5);
    }
});
test("diagonal corner impacts resolve the first face without embedding", () => {
  const m = make(),
    p = m.players[0];
  position(p, 128, 312);
  p.grounded = false;
  p.vx = 330;
  p.vy = -380;
  tick(m);
  assert.ok(p.vx < 0);
  assert.ok(p.x < 130);
});
test("walking off an edge and jumping from the top do not snag", () => {
  const m = make(),
    p = m.players[0];
  position(p, 389, 243);
  p.vx = 300;
  p.grounded = true;
  tick(m);
  assert.ok(p.x > 390);
  assert.equal(p.grounded, false);
  position(p, 200, 243);
  p.grounded = true;
  tick(m, 1, [{ flap: true }]);
  assert.ok(p.y < 243);
  assert.ok(p.vy < 0);
});
test("horizontal wrapping and safe ground keep players in the arena", () => {
  const m = make();
  position(m.players[0], 1919, 950);
  m.players[0].vx = 300;
  tick(m);
  assert.ok(m.players[0].x < 10);
  tick(m, 120);
  assert.equal(m.players[0].y, 998);
  assert.equal(m.players[0].lives, 5);
});
test("a fresh flap impulse lifts a grounded rider", () => {
  const m = make();
  const y = m.players[0].y;
  tick(m, 1, [{ flap: true }]);
  assert.ok(m.players[0].y < y);
  assert.ok(m.players[0].vy < 0);
  assert.equal(m.players[0].grounded, false);
});
test("extra lives appear on floating platforms, collect once, and expire", () => {
  const m = make();
  m.nextLife = 0;
  tick(m);
  assert.ok(m.pickup);
  assert.ok(PLATFORMS.some((p) => !p.ground && m.pickup.y === p.y - 26));
  position(m.players[0], m.pickup.x, m.pickup.y);
  tick(m);
  assert.equal(m.players[0].lives, 6);
  assert.equal(m.pickup, null);
  tick(m);
  assert.equal(m.players[0].lives, 6);
  m.pickup = { x: 900, y: 150, ttl: 0.001 };
  tick(m);
  assert.equal(m.pickup, null);
});
test("gamepad standard buttons, dead zone, d-pad and rising edges", () => {
  const pad = {
    axes: [0.1],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
  };
  assert.equal(gamepadState(pad).move, 0);
  pad.axes[0] = -0.7;
  pad.buttons[0].pressed = true;
  pad.buttons[9].pressed = true;
  const current = gamepadState(pad);
  assert.equal(current.move, -0.7);
  assert.equal(edges(current).flap, true);
  assert.equal(edges(current, current).flap, false);
  assert.equal(current.start, true);
  pad.buttons[15].pressed = true;
  assert.equal(gamepadState(pad).move, 1);
});
test("four bot FFA and team matches finish without invalid physics", () => {
  for (const mode of ["ffa", "teams"]) {
    let seed = 54;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const m = new Match(seats(4), mode, rng);
    for (let i = 0; i < 120 * 600 && !m.winner; i++) {
      m.step(
        1 / 120,
        m.players.map((p) => botInput(p, m, 1 / 120)),
      );
      m.events.length = 0;
      for (const p of m.players) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
        assert.ok(p.lives >= 0);
      }
    }
    assert.ok(m.winner, `${mode} should finish within ten simulated minutes`);
  }
});
test("a bot commits to landing attacks against a stationary human", () => {
  let seed = 731;
  const m = new Match(
    seats(2),
    "ffa",
    () => (seed = (seed * 16807) % 2147483647) / 2147483647,
  );
  for (let i = 0; i < 120 * 60 && !m.winner; i++) {
    m.step(1 / 120, [{}, botInput(m.players[1], m, 1 / 120)]);
    m.events.length = 0;
  }
  assert.ok(
    m.players[0].lives < 5,
    "bot must descend rather than hover forever above a stationary player",
  );
});

test("bots fly around a solid roof to reach a rider above", () => {
  const m = make(),
    human = m.players[0],
    bot = m.players[1];
  position(human, 200, 243);
  position(bot, 200, 380);
  for (let i = 0; i < 120 * 60 && human.lives === 5; i++) {
    m.step(1 / 120, [{}, botInput(bot, m, 1 / 120)]);
    m.events.length = 0;
  }
  assert.ok(
    human.lives < 5,
    "bot must go around the platform instead of flapping into it forever",
  );
});

test("footsteps alternate while walking, never when stationary or airborne", () => {
  const m = make(),
    p = m.players[0];
  position(p, 700, 998);
  p.grounded = true;
  m.events.length = 0;
  tick(m, 60);
  assert.equal(m.events.filter((e) => e.type === "step").length, 0);
  tick(m, 120, [{ move: 1 }]);
  const steps = m.events.filter((e) => e.type === "step" && e.id === p.id);
  assert.ok(steps.length >= 3);
  assert.notEqual(steps[0].foot, steps[1].foot);
  m.events.length = 0;
  position(p, 700, 900);
  p.vx = 200;
  p.grounded = false;
  tick(m, 20);
  assert.equal(m.events.filter((e) => e.type === "step").length, 0);
});
