/* Shared deterministic simulation. No browser or rendering dependencies. */
(function (root) {
  "use strict";
  const W = 1920,
    H = 1080;
  const CHARACTERS = [
    {
      name: "EMBER",
      bird: "Cinder dragon",
      mount: "dragon",
      color: "#ff9064",
      dark: "#b74943",
      light: "#ffe1aa",
    },
    {
      name: "MINT",
      bird: "Jade jay",
      mount: "bird",
      color: "#77e8ba",
      dark: "#2e8d89",
      light: "#e0ffd7",
    },
    {
      name: "IRIS",
      bird: "Moon pegasus",
      mount: "pegasus",
      color: "#b9a1ff",
      dark: "#7063ba",
      light: "#ece0ff",
    },
    {
      name: "SOL",
      bird: "Sun pterodactyl",
      mount: "pterodactyl",
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
  const MAX_LIVES = 5;
  const FLAP_INTERVAL = 0.22,
    BOOST_RECHARGE = 3.5,
    BOOST_DURATION = 0.32;
  const POWERUPS = Object.freeze({ flame: 5, sawblade: 3, rocket: 10 });
  const ROCKET_SPEED = 1.25;
  const BODY = Object.freeze({ halfWidth: 10, head: 21, feet: 12 });
  const TEAMS = [
    { name: "SUN", color: "#ff8a32", dark: "#49251e" },
    { name: "MOON", color: "#29dbff", dark: "#143b53" },
  ];
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
  function moveAgainstPlatforms(p, dt, events, saw = false) {
    p.grounded = false;
    let remaining = dt;
    for (let pass = 0; pass < 4 && remaining > 0; pass++) {
      const dx = p.vx * remaining,
        dy = p.vy * remaining;
      let hit = null;
      for (const platform of PLATFORMS) {
        const left = platform.ground ? -Infinity : platform.x - BODY.halfWidth;
        const right = platform.ground
          ? Infinity
          : platform.x + platform.w + BODY.halfWidth;
        const top = platform.y - BODY.feet,
          bottom = platform.y + PLATFORM_DEPTH + BODY.head;
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
        p.vx *= saw ? -1 : -1.1;
        events.push({ type: "bump", id: p.id, x: p.x, y: p.y });
      } else if (p.vy < 0) {
        p.y = hit.bottom + 0.01;
        p.vy = saw ? -p.vy : clamp(-p.vy * 0.25, 65, 110);
        events.push({ type: "bump", id: p.id, x: p.x, y: p.y - 21 });
      } else {
        p.y = hit.top - (saw ? 0.01 : 0);
        p.vy = saw ? -p.vy : 0;
        p.grounded = !saw;
      }
    }
    if (!saw) p.x = ((p.x % W) + W) % W;
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
      this.powerPickup = null;
      this.projectiles = [];
      this.nextPower = 25 + rng() * 15;
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
        lives: MAX_LIVES,
        boostCharge: 1,
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
        flapCooldown: 0,
        boostTime: 0,
        boosting: false,
        diving: false,
        walkDistance: 0,
        foot: 0,
        wasDiving: false,
        power: null,
        powerTime: 0,
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
      victim.power = null;
      victim.powerTime = 0;
      victim.lives--;
      victim.respawn = victim.lives > 0 ? 2.6 : 0;
      if (attacker) {
        attacker.kills++;
        if (attacker.power !== "sawblade") attacker.vy = -210;
      }
      this.events.push({
        type: "death",
        attackerId: attacker?.id ?? null,
        kills: attacker?.kills ?? 0,
        eliminated: victim.lives === 0,
        x: victim.x,
        y: victim.y,
        id: victim.id,
      });
    }
    equip(p, kind) {
      if (!POWERUPS[kind] || !p.alive) return;
      const wasRocket = p.power === "rocket";
      if (p.boostTime > 0 && wasRocket !== (kind === "rocket"))
        p.vx *= kind === "rocket" ? ROCKET_SPEED : 1 / ROCKET_SPEED;
      p.power = kind;
      p.powerTime = POWERUPS[kind];
      if (kind === "rocket") p.boostCharge = 1;
      if (kind === "sawblade") {
        p.boostTime = 0;
        p.vx = p.facing * 900;
        p.vy = -560;
      }
      this.events.push({ type: "power", id: p.id, kind, x: p.x, y: p.y });
    }
    fireballs(p) {
      return Array.from({ length: 6 }, (_, i) => {
        const angle = this.time * 5 + (i * Math.PI) / 3;
        return {
          x: p.x + Math.cos(angle) * 65,
          y: p.y + Math.sin(angle) * 65,
          angle,
        };
      });
    }
    canHit(attacker, victim) {
      return (
        victim.alive &&
        victim.id !== attacker.id &&
        victim.invincible <= 0 &&
        attacker.invincible <= 0 &&
        (this.mode !== "teams" || attacker.team !== victim.team)
      );
    }
    powerHits() {
      // Collect hits before applying them so opposing powers can trade KOs.
      const hits = new Map();
      for (const p of this.players) {
        if (!p.alive || !["flame", "sawblade"].includes(p.power)) continue;
        const points = p.power === "flame" ? this.fireballs(p) : [p];
        const radius = p.power === "flame" ? 29 : 43;
        for (const q of this.players)
          if (
            this.canHit(p, q) &&
            points.some(
              (f) => Math.hypot(wrapDelta(f.x, q.x), f.y - q.y) < radius,
            )
          )
            if (!hits.has(q.id)) hits.set(q.id, p);
      }
      for (const f of this.projectiles) {
        const owner = this.players[f.owner];
        for (const q of this.players) {
          if (!this.canHit(owner, q)) continue;
          const dx = f.x - f.oldX,
            dy = f.y - f.oldY;
          const t = clamp(
            ((q.x - f.oldX) * dx + (q.y - f.oldY) * dy) /
              (dx * dx + dy * dy || 1),
            0,
            1,
          );
          if (Math.hypot(q.x - f.oldX - t * dx, q.y - f.oldY - t * dy) < 29)
            if (!hits.has(q.id)) hits.set(q.id, owner);
        }
      }
      for (const [id, owner] of hits) this.kill(this.players[id], owner);
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
        if (p.powerTime > 0) {
          p.powerTime = Math.max(0, p.powerTime - dt);
          if (!p.powerTime) {
            if (p.power === "flame")
              this.projectiles.push(
                ...this.fireballs(p).map((f) => ({
                  ...f,
                  x: ((f.x % W) + W) % W,
                  oldX: ((f.x % W) + W) % W,
                  oldY: f.y,
                  owner: p.id,
                  vx: Math.cos(f.angle) * 1200,
                  vy: Math.sin(f.angle) * 1200,
                  ttl: 2,
                })),
              );
            if (p.power === "rocket" && p.boostTime > 0) p.vx /= ROCKET_SPEED;
            if (p.power === "sawblade") {
              p.vx *= 0.3;
              p.vy *= 0.3;
            }
            p.power = null;
          }
        }
        p.invincible = Math.max(0, p.invincible - dt);
        p.flapTimer = Math.max(0, p.flapTimer - dt);
        p.clash = Math.max(0, p.clash - dt);
        const input = inputs[p.id] || {},
          move = clamp(input.move || 0, -1, 1);
        if (p.power === "sawblade") {
          p.grounded = p.diving = p.boosting = false;
          moveAgainstPlatforms(p, dt, this.events, true);
          if (p.x < 26 || p.x > W - 26) {
            p.x = clamp(p.x, 26, W - 26);
            p.vx *= -1;
          }
          if (p.y < 120 || p.y > 984) {
            p.y = clamp(p.y, 120, 984);
            p.vy *= -1;
          }
          continue;
        }
        const speedScale = p.power === "rocket" ? ROCKET_SPEED : 1;
        if (p.power === "rocket") p.boostCharge = 1;
        p.flapCooldown = Math.max(0, p.flapCooldown - dt);
        p.boostTime = Math.max(0, p.boostTime - dt);
        if (!p.boostTime)
          p.boostCharge = Math.min(1, p.boostCharge + dt / BOOST_RECHARGE);
        p.diving = !!input.dive && !p.grounded;
        if (p.diving) {
          if (!p.wasDiving)
            this.events.push({ type: "dive", id: p.id, x: p.x, y: p.y });
          p.vx = 0;
          p.boostTime = 0;
          p.vy = Math.min(850, Math.max(580, p.vy) + 1500 * dt);
        } else {
          if (move && !p.boostTime) p.facing = Math.sign(move);
          if (input.boost && p.boostCharge >= 1 && !p.boostTime) {
            p.boostCharge = p.power === "rocket" ? 1 : 0;
            p.boostTime = BOOST_DURATION;
            p.vx = p.facing * 650 * speedScale;
            this.events.push({ type: "boost", id: p.id, x: p.x, y: p.y });
          }
          if (!p.boostTime) {
            p.vx += move * (p.grounded ? 1150 : 750) * speedScale * dt;
            p.vx *= Math.exp(-(move ? 1.5 : p.grounded ? 8 : 1.2) * dt);
            p.vx = clamp(p.vx, -330 * speedScale, 330 * speedScale);
          }
          if (
            !input.dive &&
            (input.flap || (input.flapHeld && p.flapCooldown <= 0))
          ) {
            p.vy = Math.max(-380, p.vy - 205);
            p.grounded = false;
            p.flapTimer = 0.12;
            p.flapCooldown = FLAP_INTERVAL;
            this.events.push({ type: "flap", id: p.id, x: p.x, y: p.y });
          }
          p.vy = Math.min(520, p.vy + 650 * dt);
        }
        p.wasDiving = p.diving;
        p.boosting = p.boostTime > 0;
        const oldX = p.x;
        moveAgainstPlatforms(p, dt, this.events);
        if (p.grounded && Math.abs(p.vx) > 35) {
          p.walkDistance =
            (p.walkDistance || 0) + Math.abs(wrapDelta(p.x, oldX));
          if (p.walkDistance >= 25) {
            p.walkDistance %= 25;
            p.foot ^= 1;
            this.events.push({ type: "step", id: p.id, foot: p.foot });
          }
        } else p.walkDistance = 0;
        if (p.y < 104) {
          p.y = 104;
          p.vy = Math.max(0, p.vy);
        }
      }
      for (const f of this.projectiles) {
        f.oldX = f.x;
        f.oldY = f.y;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.ttl -= dt;
      }
      this.powerHits();
      this.projectiles = this.projectiles.filter(
        (f) => f.ttl > 0 && f.x >= -20 && f.x <= W + 20 && f.y >= 0 && f.y <= H,
      );
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
            const maxReached = p.lives >= MAX_LIVES;
            p.lives = Math.min(MAX_LIVES, p.lives + 1);
            this.events.push({
              type: "life",
              x: p.x,
              y: p.y,
              id: p.id,
              maxReached,
            });
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
      if (this.powerPickup) {
        this.powerPickup.ttl -= dt;
        for (const p of this.players) {
          if (
            p.alive &&
            Math.abs(wrapDelta(p.x, this.powerPickup.x)) < 30 &&
            Math.abs(p.y - this.powerPickup.y) < 34
          ) {
            this.equip(p, this.powerPickup.kind);
            this.powerPickup = null;
            break;
          }
        }
        if (this.powerPickup?.ttl <= 0) this.powerPickup = null;
      }
      if (!this.powerPickup && this.time >= this.nextPower) {
        const s = chooseSpawn(this.players, this.rng);
        const kinds = Object.keys(POWERUPS);
        this.powerPickup = {
          x: s.x,
          y: s.y - 14,
          ttl: 12,
          kind: kinds[
            Math.min(kinds.length - 1, Math.floor(this.rng() * kinds.length))
          ],
        };
        this.nextPower = this.time + 25 + this.rng() * 15;
        this.events.push({
          type: "power-appeared",
          kind: this.powerPickup.kind,
        });
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
    const enemy = targets
      .filter((q) => q.invincible <= 0)
      .sort(
        (a, b) =>
          Math.hypot(wrapDelta(a.x, p.x), a.y - p.y) -
          Math.hypot(wrapDelta(b.x, p.x), b.y - p.y),
      )[0];
    const distance = (q) => Math.hypot(wrapDelta(q.x, p.x), q.y - p.y);
    const pickups = [
      match.pickup && {
        ...match.pickup,
        item: true,
        priority: p.lives < MAX_LIVES ? 0.45 : 1.2,
      },
      match.powerPickup && {
        ...match.powerPickup,
        item: true,
        priority: p.power ? 1.3 : 0.6,
      },
    ]
      .filter(Boolean)
      .sort((a, b) => distance(a) * a.priority - distance(b) * b.priority);
    const item = pickups[0];
    const target =
      item && (!enemy || distance(item) * item.priority < distance(enemy) + 220)
        ? item
        : enemy;
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
    const desiredY = target
      ? Math.max(125, target.y - (target.item ? 0 : 75))
      : 400;
    // Once above a rival, stop flapping and commit to a landing attack.
    if (!target || target.item || Math.abs(dx) > 30 || p.y > target.y + 25)
      p.botDive = false;
    if (target && !target.item && Math.abs(dx) < 24 && p.y < target.y - 28)
      p.botDive = true;
    const flap =
      !p.botDive &&
      p.botClock <= 0 &&
      (p.y > desiredY || (p.vy > 160 && p.y > 180));
    if (flap) p.botClock = 0.18 + match.rng() * 0.14;
    const steering = dx - p.vx * 0.18;
    const dive =
      !!target &&
      !target.item &&
      p.botDive &&
      !p.grounded &&
      target.y > p.y + 28 &&
      Math.abs(dx + target.vx * 0.12) < 26 &&
      !PLATFORMS.some(
        (s) =>
          s.y > p.y && s.y < target.y && p.x > s.x - 10 && p.x < s.x + s.w + 10,
      );
    const boost =
      !dive &&
      !!target &&
      p.boostCharge >= 1 &&
      !p.boostTime &&
      Math.abs(dx) > 180 &&
      Math.abs(dx) < 650 &&
      Math.abs(target.y - p.y) < 100;
    return {
      move: Math.abs(steering) < 12 ? 0 : Math.sign(steering),
      flap,
      dive,
      boost,
    };
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
      boost: pressed(2),
      up: pressed(12) || (pad?.axes?.[1] || 0) < -0.55,
      down: pressed(13) || (pad?.axes?.[1] || 0) > 0.55,
      dive: pressed(13) || (pad?.axes?.[1] || 0) > 0.55,
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
    BODY,
    TEAMS,
    POWERUPS,
    BOOST_RECHARGE,
    BOOST_DURATION,
    FLAP_INTERVAL,
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
