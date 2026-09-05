/* Shared deterministic simulation. No browser or rendering dependencies. */
(function (root) {
  "use strict";
  const W = 1920,
    H = 1080;
  const CHARACTERS = [
    {
      name: "EMBER",
      bird: "Firefinch",
      color: "#ff9064",
      dark: "#b74943",
      light: "#ffe1aa",
    },
    {
      name: "MINT",
      bird: "Jade jay",
      color: "#77e8ba",
      dark: "#2e8d89",
      light: "#e0ffd7",
    },
    {
      name: "IRIS",
      bird: "Moon swift",
      color: "#b9a1ff",
      dark: "#7063ba",
      light: "#ece0ff",
    },
    {
      name: "SOL",
      bird: "Golden kite",
      color: "#f8d66d",
      dark: "#b98746",
      light: "#fff4bf",
    },
  ];
  const PLATFORMS = [
    { x: 140, y: 255, w: 240 },
    { x: 840, y: 200, w: 240 },
    { x: 1540, y: 255, w: 240 },
    { x: 475, y: 420, w: 210 },
    { x: 1235, y: 420, w: 210 },
    { x: 60, y: 610, w: 250 },
    { x: 830, y: 580, w: 260 },
    { x: 1610, y: 610, w: 250 },
    { x: 435, y: 785, w: 270 },
    { x: 1215, y: 785, w: 270 },
    { x: 0, y: 1010, w: 1920, ground: true },
  ];
  const PLATFORM_DEPTH = 35;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const wrapDelta = (a, b) => {
    let d = a - b;
    if (d > W / 2) d -= W;
    if (d < -W / 2) d += W;
    return d;
  };
  function chooseSpawn(players, rng = Math.random) {
    const candidates = PLATFORMS.filter((p) => !p.ground).map((p) => ({
      x: p.x + 30 + rng() * (p.w - 60),
      y: p.y - 12,
    }));
    const alive = players.filter((p) => p.alive);
    const score = (s) =>
      alive.length
        ? Math.min(
            ...alive.map((p) => Math.hypot(wrapDelta(s.x, p.x), s.y - p.y)),
          )
        : rng() * W;
    return candidates
      .map((s) => ({ ...s, score: score(s) }))
      .sort((a, b) => b.score - a.score)[0];
  }
  // Sweep the rider's body against expanded platform rectangles, choosing the
  // first face struck. This prevents fast and diagonal impacts from tunneling.
  function moveAgainstPlatforms(p, dt, events) {
    p.grounded = false;
    let remaining = dt;
    for (let pass = 0; pass < 4 && remaining > 0; pass++) {
      const dx = p.vx * remaining,
        dy = p.vy * remaining;
      let hit = null;
      for (const platform of PLATFORMS) {
        const left = platform.ground ? -Infinity : platform.x - 10;
        const right = platform.ground ? Infinity : platform.x + platform.w + 10;
        const top = platform.y - 12,
          bottom = platform.y + PLATFORM_DEPTH + 21;
        const slab = (origin, delta, min, max) => {
          if (delta === 0)
            return origin > min && origin < max ? [-Infinity, Infinity] : null;
          return delta > 0
            ? [(min - origin) / delta, (max - origin) / delta]
            : [(max - origin) / delta, (min - origin) / delta];
        };
        const tx = slab(p.x, dx, left, right),
          ty = slab(p.y, dy, top, bottom);
        if (!tx || !ty) continue;
        const enter = Math.max(tx[0], ty[0]),
          exit = Math.min(tx[1], ty[1]);
        if (enter < 0 || enter > 1 || enter > exit || exit <= 0) continue;
        if (!hit || enter < hit.time)
          hit = {
            time: enter,
            side: tx[0] > ty[0],
            platform,
            left,
            right,
            top,
            bottom,
          };
      }
      if (!hit) {
        p.x += dx;
        p.y += dy;
        break;
      }
      p.x += dx * hit.time;
      p.y += dy * hit.time;
      remaining *= 1 - hit.time;
      if (hit.side) {
        p.x = p.vx > 0 ? hit.left - 0.01 : hit.right + 0.01;
        p.vx *= -0.6;
        events.push({ type: "bump", id: p.id, x: p.x, y: p.y });
      } else if (p.vy < 0) {
        p.y = hit.bottom + 0.01;
        p.vy = clamp(-p.vy * 0.25, 65, 110);
        events.push({ type: "bump", id: p.id, x: p.x, y: p.y - 21 });
      } else {
        p.y = hit.top;
        p.vy = 0;
        p.grounded = true;
      }
    }
    p.x = ((p.x % W) + W) % W;
    if (
      p.grounded &&
      !PLATFORMS.some(
        (s) => p.y === s.y - 12 && p.x + 10 > s.x && p.x - 10 < s.x + s.w,
      )
    )
      p.grounded = false;
  }
  class Match {
    constructor(seats, mode = "ffa", rng = Math.random) {
      this.rng = rng;
      this.mode = mode;
      this.time = 0;
      this.events = [];
      this.pickup = null;
      this.nextLife = 18 + rng() * 8;
      this.winner = null;
      this.players = seats.map((s, id) => ({
        ...s,
        id,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        facing: id % 2 ? -1 : 1,
        lives: 5,
        kills: 0,
        alive: false,
        invincible: 0,
        respawn: 0,
        flapTimer: 0,
        grounded: false,
        clash: 0,
      }));
      this.players.forEach((p) => this.spawn(p));
      this.events = [];
    }
    spawn(p) {
      Object.assign(p, chooseSpawn(this.players, this.rng), {
        vx: 0,
        vy: 0,
        alive: true,
        invincible: 2,
        grounded: true,
        respawn: 0,
        clash: 0,
        botExit: null,
        botClimb: null,
        botDive: false,
        botClock: 0,
      });
      this.events.push({ type: "spawn", x: p.x, y: p.y, id: p.id });
    }
    kill(victim, attacker) {
      if (!victim.alive || victim.invincible > 0) return;
      victim.alive = false;
      victim.lives--;
      victim.respawn = victim.lives > 0 ? 2.6 : 0;
      if (attacker) {
        attacker.kills++;
        attacker.vy = -210;
      }
      this.events.push({
        type: "death",
        x: victim.x,
        y: victim.y,
        id: victim.id,
      });
    }
    step(dt, inputs = []) {
      if (this.winner) return;
      this.time += dt;
      for (const p of this.players) {
        if (!p.alive) {
          if (p.lives > 0) {
            p.respawn -= dt;
            if (p.respawn <= 0) this.spawn(p);
          }
          continue;
        }
        p.invincible = Math.max(0, p.invincible - dt);
        p.flapTimer = Math.max(0, p.flapTimer - dt);
        p.clash = Math.max(0, p.clash - dt);
        const input = inputs[p.id] || {},
          move = clamp(input.move || 0, -1, 1);
        p.vx += move * (p.grounded ? 1150 : 750) * dt;
        p.vx *= Math.exp(-(move ? 1.5 : p.grounded ? 8 : 1.2) * dt);
        p.vx = clamp(p.vx, -330, 330);
        if (move) p.facing = Math.sign(move);
        if (input.flap) {
          p.vy = Math.max(-380, p.vy - 205);
          p.grounded = false;
          p.flapTimer = 0.16;
          this.events.push({ type: "flap", id: p.id, x: p.x, y: p.y });
        }
        p.vy = Math.min(520, p.vy + 650 * dt);
        moveAgainstPlatforms(p, dt, this.events);
        if (p.y < 104) {
          p.y = 104;
          p.vy = Math.max(0, p.vy);
        }
      }
      for (let i = 0; i < this.players.length; i++)
        for (let j = i + 1; j < this.players.length; j++) {
          const a = this.players[i],
            b = this.players[j];
          if (
            !a.alive ||
            !b.alive ||
            a.invincible > 0 ||
            b.invincible > 0 ||
            a.clash ||
            b.clash ||
            (this.mode === "teams" && a.team === b.team)
          )
            continue;
          const dx = wrapDelta(a.x, b.x),
            dy = a.y - b.y;
          if (Math.abs(dx) < 27 && Math.abs(dy) < 25) {
            if (Math.abs(dy) > 7) this.kill(dy < 0 ? b : a, dy < 0 ? a : b);
            else {
              const side = dx === 0 ? (a.id < b.id ? -1 : 1) : Math.sign(dx);
              a.vx = side * 260;
              b.vx = -side * 260;
              a.vy = b.vy = -100;
              a.clash = b.clash = 0.2;
              this.events.push({
                type: "clash",
                x: (b.x + dx / 2 + W) % W,
                y: a.y,
              });
            }
          }
        }
      if (this.pickup) {
        this.pickup.ttl -= dt;
        for (const p of this.players)
          if (
            p.alive &&
            Math.abs(wrapDelta(p.x, this.pickup.x)) < 28 &&
            Math.abs(p.y - this.pickup.y) < 32
          ) {
            p.lives++;
            this.events.push({ type: "life", x: p.x, y: p.y, id: p.id });
            this.pickup = null;
            break;
          }
        if (this.pickup?.ttl <= 0) this.pickup = null;
      }
      if (this.time >= this.nextLife && !this.pickup) {
        const s = chooseSpawn(this.players, this.rng);
        this.pickup = { x: s.x, y: s.y - 14, ttl: 15 };
        this.nextLife = this.time + 24 + this.rng() * 12;
        this.events.push({ type: "pickup", x: s.x, y: s.y });
      }
      const survivors = this.players.filter((p) => p.lives > 0);
      if (this.mode === "teams") {
        const teams = [...new Set(survivors.map((p) => p.team))];
        if (teams.length <= 1)
          this.winner = { team: teams[0] ?? null, draw: teams.length === 0 };
      } else if (survivors.length <= 1)
        this.winner = {
          id: survivors[0]?.id ?? null,
          draw: survivors.length === 0,
        };
    }
  }
  function botInput(p, match, dt) {
    if (!p.alive) return {};
    const targets = match.players.filter(
      (q) =>
        q.id !== p.id &&
        q.alive &&
        (match.mode !== "teams" || q.team !== p.team),
    );
    const target = targets.sort(
      (a, b) =>
        Math.hypot(wrapDelta(a.x, p.x), a.y - p.y) -
        Math.hypot(wrapDelta(b.x, p.x), b.y - p.y),
    )[0];
    p.botClock = (p.botClock || 0) - dt;
    if (p.botClimb && (!target || p.y < p.botClimb.untilY)) p.botClimb = null;
    if (!p.botClimb && target && target.y < p.y - 40) {
      const roof = PLATFORMS.filter(
        (s) =>
          !s.ground &&
          p.y - 21 >= s.y + PLATFORM_DEPTH &&
          p.y - s.y < 200 &&
          p.x > s.x - 20 &&
          p.x < s.x + s.w + 20,
      ).sort((a, b) => b.y - a.y)[0];
      if (roof)
        p.botClimb = {
          x: p.x < roof.x + roof.w / 2 ? roof.x - 45 : roof.x + roof.w + 45,
          untilY: roof.y - 40,
        };
    }
    if (p.botClimb) {
      p.botExit = null;
      const flap = p.botClock <= 0;
      if (flap) p.botClock = 0.22 + match.rng() * 0.08;
      const dx = wrapDelta(p.botClimb.x, p.x) - p.vx * 0.18;
      return { move: Math.abs(dx) < 8 ? 0 : Math.sign(dx), flap };
    }
    if (p.botExit && p.y > p.botExit.untilY) p.botExit = null;
    if (target && p.grounded && target.y > p.y + 40) {
      const platform = PLATFORMS.find(
        (s) =>
          !s.ground &&
          Math.abs(s.y - p.y - 12) < 1 &&
          p.x >= s.x - 10 &&
          p.x <= s.x + s.w + 10,
      );
      if (platform)
        p.botExit = {
          x:
            p.x - platform.x < platform.x + platform.w - p.x
              ? platform.x - 45
              : platform.x + platform.w + 45,
          untilY: platform.y + 35,
        };
    }
    if (p.botExit)
      return { move: Math.sign(wrapDelta(p.botExit.x, p.x)), flap: false };
    const dx = target ? wrapDelta(target.x, p.x) : Math.sin(match.time) * 200;
    const desiredY = target ? Math.max(125, target.y - 75) : 400;
    // Once above a rival, stop flapping and commit to a landing attack.
    if (!target || Math.abs(dx) > 110 || p.y > target.y + 25) p.botDive = false;
    if (target && Math.abs(dx) < 55 && p.y < target.y - 28) p.botDive = true;
    const flap =
      !p.botDive &&
      p.botClock <= 0 &&
      (p.y > desiredY || (p.vy > 160 && p.y > 180));
    if (flap) p.botClock = 0.18 + match.rng() * 0.14;
    const steering = dx - p.vx * 0.18;
    return { move: Math.abs(steering) < 12 ? 0 : Math.sign(steering), flap };
  }
  function gamepadState(pad) {
    const pressed = (i) => !!pad?.buttons?.[i]?.pressed;
    const axis = pad?.axes?.[0] || 0;
    return {
      move: pressed(14)
        ? -1
        : pressed(15)
          ? 1
          : Math.abs(axis) > 0.22
            ? axis
            : 0,
      flap: pressed(0),
      back: pressed(1) || pressed(8),
      start: pressed(9),
      team: pressed(2),
      mode: pressed(3),
    };
  }
  function edges(current, previous = {}) {
    return Object.fromEntries(
      Object.entries(current).map(([k, v]) => [
        k,
        k === "move" ? v : !!v && !previous[k],
      ]),
    );
  }
  const api = {
    W,
    H,
    CHARACTERS,
    PLATFORMS,
    PLATFORM_DEPTH,
    Match,
    chooseSpawn,
    wrapDelta,
    botInput,
    gamepadState,
    edges,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Featherfall = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
