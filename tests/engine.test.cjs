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
  m.players[0].lives = 4;
  tick(m);
  assert.equal(m.players[0].lives, 5);
  assert.equal(m.pickup, null);
  tick(m);
  assert.equal(m.players[0].lives, 5);
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

test("full-life riders consume feathers once without gaining a sixth life", () => {
  const m = make();
  m.pickup = { x: 700, y: 900, ttl: 10 };
  position(m.players[0], 700, 900);
  position(m.players[1], 700, 900);
  m.players[1].lives = 4;
  m.players[1].invincible = 1;
  tick(m);
  assert.equal(m.players[0].lives, 5);
  assert.equal(m.players[1].lives, 4);
  assert.equal(m.pickup, null);
  const events = m.events.filter((e) => e.type === "life");
  assert.equal(events.length, 1);
  assert.equal(events[0].maxReached, true);
  assert.equal(events[0].id, 0);
  tick(m);
  assert.equal(m.events.filter((e) => e.type === "life").length, 1);
});

test("dive drops straight down, defeats a rider below, and stops on solid tops", () => {
  const m = make(),
    p = m.players[0],
    rival = m.players[1];
  position(p, 700, 850);
  p.grounded = false;
  p.vx = 300;
  position(rival, 700, 920);
  rival.grounded = false;
  tick(m, 1, [{ dive: true, move: 1, flap: true, boost: true }]);
  assert.equal(p.vx, 0);
  assert.ok(p.vy > 580);
  assert.equal(p.boostCharge, 1);
  tick(m, 20, [{ dive: true }]);
  assert.equal(rival.lives, 4);
  position(p, 200, 170);
  p.grounded = false;
  tick(m, 30, [{ dive: true, flapHeld: true }]);
  assert.equal(p.y, 243);
  assert.equal(p.grounded, true);
});

test("boost is directional, recharges after use, and does not refill on death", () => {
  const m = make(),
    p = m.players[0];
  position(p, 700, 900);
  p.grounded = false;
  tick(m, 1, [{ boost: true, move: -1 }]);
  assert.equal(p.vx, -650);
  assert.equal(p.boostCharge, 0);
  tick(m, 20, [{ boost: true }]);
  assert.equal(m.events.filter((e) => e.type === "boost").length, 1);
  tick(m, 240);
  assert.ok(p.boostCharge > 0 && p.boostCharge < 1);
  const charge = p.boostCharge;
  m.kill(p);
  tick(m, 300);
  assert.equal(p.boostCharge, charge);
  tick(m, 14);
  assert.equal(p.alive, true);
  assert.ok(p.boostCharge < 1);
  tick(m, 210);
  assert.equal(p.boostCharge, 1);
});

test("boost rebounds at full speed from solid sides without tunneling", () => {
  for (const direction of [-1, 1]) {
    const m = make(),
      p = m.players[0];
    position(p, direction === 1 ? 128 : 392, 275);
    p.grounded = false;
    tick(m, 1, [{ boost: true, move: direction }]);
    assert.ok(Math.abs(p.vx + direction * 715) < 1e-8);
    assert.ok(direction === 1 ? p.x < 130 : p.x > 390);
    tick(m, 1, [{ move: direction }]);
    assert.ok(
      Math.abs(p.vx + direction * 715) < 1e-8,
      "boost must not reset rebound velocity",
    );
  }
});

test("mount appearances share exactly the same movement and collision rules", () => {
  const results = [];
  for (let character = 0; character < 7; character++) {
    const m = make(),
      p = m.players[0];
    p.character = character;
    position(p, 200, 313);
    p.grounded = false;
    p.vy = -360;
    tick(m);
    results.push([p.x, p.y, p.vx, p.vy, p.lives]);
  }
  results.forEach((r) => assert.deepEqual(r, results[0]));
  assert.equal(
    new Set(require("../engine.js").CHARACTERS.map((c) => c.mount)).size,
    7,
  );
});

test("vertical stick and d-pad expose navigation and dive; X boost is edge-triggered", () => {
  const pad = {
    axes: [0, 0.8],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
  };
  assert.equal(gamepadState(pad).dive, true);
  assert.equal(gamepadState(pad).down, true);
  pad.axes[1] = -0.8;
  assert.equal(gamepadState(pad).up, true);
  pad.axes[1] = 0;
  pad.buttons[13].pressed = true;
  pad.buttons[2].pressed = true;
  const state = gamepadState(pad);
  assert.equal(state.dive, true);
  assert.equal(edges(state).boost, true);
  assert.equal(edges(state, state).boost, false);
});

test("bots pursue feathers and powers, boost on approaches and dive on aligned rivals", () => {
  const m = make(),
    [p, q] = m.players;
  position(p, 700, 700);
  position(q, 1100, 710);
  assert.equal(botInput(p, m, 1 / 120).boost, true);
  position(p, 740, 700);
  position(q, 740, 850);
  p.grounded = false;
  assert.equal(botInput(p, m, 1 / 120).dive, true);
  p.lives = 3;
  m.pickup = { x: 450, y: 700, ttl: 10 };
  assert.equal(botInput(p, m, 1 / 120).move, -1);
  assert.equal(botInput(p, m, 1 / 120).dive, false);
  m.pickup = null;
  m.powerPickup = { x: 450, y: 700, kind: "rocket", ttl: 10 };
  assert.equal(botInput(p, m, 1 / 120).move, -1);
});
test("power-ups are scarce, expire uncollected and apply once on contact", () => {
  const m = make();
  assert.equal(m.powerPickup, null);
  assert.ok(m.nextPower >= 25 && m.nextPower <= 40);
  m.time = m.nextPower;
  tick(m);
  assert.ok(["flame", "sawblade", "rocket"].includes(m.powerPickup.kind));
  assert.ok(m.nextPower - m.time >= 25);
  m.powerPickup.ttl = 0;
  tick(m);
  assert.equal(m.powerPickup, null);
  const p = m.players[0];
  m.powerPickup = { x: p.x, y: p.y, kind: "rocket", ttl: 12 };
  tick(m);
  assert.equal(p.power, "rocket");
  assert.equal(m.powerPickup, null);
  assert.equal(m.events.filter((e) => e.type === "power").length, 1);
});
test("flame orbits for five seconds then launches six fast lethal projectiles", () => {
  const m = make(),
    [p, q] = m.players;
  position(p, 700, 700);
  position(q, 765, 700);
  m.equip(p, "flame");
  m.powerHits();
  assert.equal(q.lives, 4);
  assert.equal(p.kills, 1);
  assert.equal(p.powerTime, 5);
  position(q, 1400, 900);
  p.powerTime = 0.005;
  tick(m);
  assert.equal(p.power, null);
  assert.equal(m.projectiles.length, 6);
  assert.ok(
    m.projectiles.every((f) => Math.abs(Math.hypot(f.vx, f.vy) - 1200) < 0.01),
  );
  const f = m.projectiles[0];
  position(q, f.x + f.vx / 240, f.y + f.vy / 240);
  tick(m);
  assert.equal(q.alive, false);
  assert.equal(p.kills, 2);
  tick(m, 250);
  assert.equal(m.projectiles.length, 0);
});
test("powers honor teams and protection; simultaneous saw hits credit both players", () => {
  const m = make("teams", 3),
    [a, b, c] = m.players;
  position(a, 700, 700);
  position(b, 715, 700);
  position(c, 720, 700);
  m.equip(a, "sawblade");
  b.invincible = 1;
  m.powerHits();
  assert.ok(b.alive && c.alive);
  b.invincible = 0;
  a.invincible = 1;
  m.powerHits();
  assert.ok(b.alive);
  a.invincible = 0;
  m.equip(b, "sawblade");
  m.powerHits();
  assert.equal(a.alive, false);
  assert.equal(b.alive, false);
  assert.equal(a.kills, 1);
  assert.equal(b.kills, 2); // b also touches c
  assert.equal(a.power, null);
  assert.equal(b.power, null);
  const deaths = m.events.filter((e) => e.type === "death");
  assert.ok(deaths.every((e) => e.attackerId !== null && e.kills > 0));
});
test("saw wraps both horizontal edges without reversing velocity", () => {
  for (const direction of [-1, 1]) {
    const m = make(),
      p = m.players[0];
    position(p, direction > 0 ? W - 1 : 1, 900);
    m.equip(p, "sawblade");
    p.vx = direction * 900;
    p.vy = 0;
    tick(m);
    assert.equal(p.vx, direction * 900);
    assert.ok(direction > 0 ? p.x < 10 : p.x > W - 10);
  }
});
test("saw still bounces off ceiling, ground and every platform face", () => {
  const check = (x, y, vx, vy, axis) => {
    const m = make(),
      p = m.players[0];
    position(p, x, y);
    m.equip(p, "sawblade");
    Object.assign(p, { vx, vy });
    tick(m);
    assert.equal(p[axis], -(axis === "vx" ? vx : vy));
  };
  check(700, 121, 0, -560, "vy");
  check(700, 983, 0, 560, "vy");
  for (const platform of PLATFORMS.filter((s) => !s.ground)) {
    check(platform.x + platform.w / 2, platform.y - 13, 0, 560, "vy");
    check(platform.x + platform.w / 2, platform.y + 57, 0, -560, "vy");
    check(platform.x - 11, platform.y + 10, 900, 0, "vx");
    check(platform.x + platform.w + 11, platform.y + 10, -900, 0, "vx");
  }
});
test("saw expires without embedding in terrain", () => {
  const m = make(),
    p = m.players[0];
  position(p, 700, 760);
  m.equip(p, "sawblade");
  p.vy = 560;
  tick(m, 370);
  assert.equal(p.power, null);
  assert.ok(Number.isFinite(p.x) && p.y <= 998);
  assert.ok(
    !PLATFORMS.some(
      (s) =>
        p.x > s.x - 10 &&
        p.x < s.x + s.w + 10 &&
        p.y > s.y - 12 + 0.1 &&
        p.y < s.y + 56 - 0.1,
    ),
  );
});
test("rocket permits repeated boosts for ten seconds and death clears power", () => {
  const m = make(),
    p = m.players[0];
  position(p, 700, 900);
  p.boostCharge = 0;
  m.equip(p, "rocket");
  tick(m, 100, [{ boost: true }]);
  assert.ok(m.events.filter((e) => e.type === "boost").length >= 3);
  assert.equal(p.boostCharge, 1);
  p.powerTime = 0.005;
  p.boostTime = 0;
  tick(m, 1, [{ boost: true }]);
  assert.equal(p.power, null);
  assert.equal(p.boostCharge, 0);
  m.equip(p, "flame");
  m.kill(p);
  assert.equal(p.power, null);
  tick(m, 320);
  assert.equal(p.power, null);
  assert.equal(m.projectiles.length, 0);
});
test("opposing final power hits produce a draw and elimination events", () => {
  const m = make(),
    [a, b] = m.players;
  position(a, 700, 900);
  position(b, 720, 900);
  a.lives = b.lives = 1;
  m.equip(a, "sawblade");
  m.equip(b, "sawblade");
  tick(m);
  assert.equal(m.winner.draw, true);
  assert.equal(
    m.events.filter((e) => e.type === "death" && e.eliminated).length,
    2,
  );
});

test("bots reach elevated feathers and every power-up before expiration", () => {
  for (const kind of ["life", "flame", "sawblade", "rocket"]) {
    const m = make(),
      [p, q] = m.players;
    position(p, 740, 998);
    p.lives = 3;
    position(q, 1600, 998);
    q.invincible = 999;
    const pickup = { x: 950, y: 554, ttl: 12, kind };
    if (kind === "life") m.pickup = pickup;
    else m.powerPickup = pickup;
    let collected = false;
    for (let i = 0; i < 1440; i++) {
      tick(m, 1, [botInput(p, m, 1 / 120)]);
      if (
        m.events.some(
          (e) => e.id === p.id && ["life", "power"].includes(e.type),
        )
      ) {
        collected = true;
        break;
      }
      m.events.length = 0;
    }
    assert.ok(collected, kind + " should be collected before despawning");
  }
});
test("each power lasts its full configured duration in simulation time", () => {
  for (const [kind, duration] of Object.entries(
    require("../engine.js").POWERUPS,
  )) {
    const m = make(),
      p = m.players[0];
    m.players[1].invincible = 999;
    m.equip(p, kind);
    tick(m, duration * 120 - 1);
    assert.equal(p.power, kind);
    tick(m, 2);
    assert.equal(p.power, null);
  }
});

test("rocket adds 56.25 percent horizontal speed without changing vertical movement", () => {
  for (const grounded of [false, true]) {
    const normal = make(),
      rocket = make();
    for (const m of [normal, rocket]) {
      position(m.players[0], 740, grounded ? 998 : 900);
      m.players[0].grounded = grounded;
      m.players[0].vx = 100;
      m.players[1].invincible = 999;
    }
    rocket.equip(rocket.players[0], "rocket");
    rocket.players[0].vx *= 1.5625;
    tick(normal, 20, [{ move: 1 }]);
    tick(rocket, 20, [{ move: 1 }]);
    assert.ok(
      Math.abs(rocket.players[0].vx - normal.players[0].vx * 1.5625) < 0.001,
    );
    assert.equal(rocket.players[0].vy, normal.players[0].vy);
  }
  const m = make(),
    p = m.players[0];
  position(p, 740, 900);
  p.vx = 600;
  m.equip(p, "rocket");
  tick(m, 1, [{ move: 1 }]);
  assert.equal(p.vx, 515.625);
});
test("rocket boosts are faster in either direction, rebound, and lose bonus on expiry", () => {
  for (const direction of [-1, 1]) {
    const m = make(),
      p = m.players[0];
    position(p, 740, 900);
    p.facing = direction;
    m.equip(p, "rocket");
    tick(m, 1, [{ boost: true }]);
    assert.equal(p.vx, direction * 1015.625);
    assert.equal(p.boostCharge, 1);
    p.powerTime = 0.001;
    tick(m);
    assert.equal(p.vx, direction * 650);
  }
  const m = make(),
    p = m.players[0];
  position(p, 720, 790);
  p.facing = -1;
  m.equip(p, "rocket");
  tick(m, 1, [{ boost: true }]);
  assert.ok(
    p.vx > 1015.625,
    "swept platform collision rebounds the faster boost",
  );
  assert.ok(p.x > 715, "rider stays outside the platform");
});
test("collecting rocket during a boost adds its bonus once and dive still wins", () => {
  const m = make(),
    p = m.players[0];
  position(p, 740, 900);
  p.grounded = false;
  tick(m, 1, [{ boost: true }]);
  const before = p.vx;
  m.equip(p, "rocket");
  assert.equal(p.vx, before * 1.5625);
  m.equip(p, "rocket");
  assert.equal(p.vx, before * 1.5625);
  m.equip(p, "flame");
  assert.equal(p.vx, before);
  m.equip(p, "rocket");
  tick(m, 1, [{ dive: true, boost: true }]);
  assert.equal(p.vx, 0);
  assert.ok(p.diving);
  assert.equal(p.boostTime, 0);
});

test("award telemetry records real actions and survives respawn without counting dead time", () => {
  const m = make(),
    [p, q] = m.players;
  position(p, 740, 900);
  position(q, 1500, 900);
  p.grounded = false;
  q.invincible = 999;
  tick(m, 1, [{ move: 1, flap: true, boost: true }]);
  assert.equal(p.stats.flaps, 1);
  assert.equal(p.stats.boosts, 1);
  assert.ok(
    p.stats.distance > 0 && p.stats.peakSpeed >= 650 && p.stats.airTime > 0,
  );
  tick(m, 1, [{ dive: true }]);
  assert.equal(p.stats.dives, 1);
  m.pickup = { x: p.x, y: p.y, ttl: 10 };
  tick(m);
  assert.equal(p.stats.feathers, 1);
  m.equip(p, "flame");
  assert.equal(p.stats.flamePickups, 1);
  assert.equal(p.stats.powerups, 1);
  m.kill(p);
  const distance = p.stats.distance;
  const air = p.stats.airTime;
  tick(m, 200);
  assert.equal(p.stats.distance, distance);
  assert.equal(p.stats.airTime, air);
  tick(m, 120);
  assert.ok(p.alive);
  assert.equal(p.stats.deaths, 1);
  assert.equal(p.stats.flaps, 1);
});
test("awards distinguish dive KOs, power KOs, and last-life KOs", () => {
  const m = make(),
    [p, q] = m.players;
  position(p, 740, 900);
  position(q, 740, 920);
  p.lives = 1;
  p.diving = true;
  m.kill(q, p);
  assert.equal(p.stats.diveKOs, 1);
  assert.equal(p.stats.comebackKOs, 1);
  position(q, 800, 900);
  p.diving = false;
  m.kill(q, p, "flame");
  assert.equal(p.stats.powerKOs, 1);
  assert.equal(p.stats.diveKOs, 1);
});
