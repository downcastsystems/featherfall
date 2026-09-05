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
test("platforms allow ascent through them and catch descent", () => {
  const m = make();
  const p = m.players[0];
  position(p, 200, 270);
  p.vy = -300;
  tick(m, 20);
  assert.ok(p.y < 240);
  p.vy = 100;
  tick(m, 80);
  assert.equal(p.y, 243);
  assert.equal(p.grounded, true);
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
