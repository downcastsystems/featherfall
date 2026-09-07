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
    {
      name: "ACORN",
      bird: "Flying squirrel",
      mount: "squirrel",
      color: "#c99970",
      dark: "#76503e",
      light: "#f0d5aa",
    },
    {
      name: "BUZZ",
      bird: "Bumblebee",
      mount: "bee",
      color: "#edca52",
      dark: "#38313a",
      light: "#fff0b1",
    },
    {
      name: "LUNA",
      bird: "Moon moth",
      mount: "moth",
      color: "#d8dce2",
      dark: "#858b9c",
      light: "#f7f3e8",
    },
    {
      name: "RIPPLE",
      bird: "Blue flying fish",
      mount: "fish",
      color: "#69c7ff",
      dark: "#326aab",
      light: "#d8f3ff",
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
  // Build every layout from its left half plus centered platforms.
  function mirroredPlatforms(rows) {
    return rows
      .flatMap(([x, y, w]) =>
        x + w / 2 === W / 2
          ? [{ x, y, w }]
          : [
              { x, y, w },
              { x: W - x - w, y, w },
            ],
      )
      .concat({ x: 0, y: 1010, w: W, ground: true });
  }
  const ARENAS = [
    {
      id: "hollow",
      name: "The Hollow Sky",
      motif: "moon",
      platforms: PLATFORMS,
      sky: ["#101a2d", "#1b3548", "#395455"],
      rock: "#354247",
      top: "#59605a",
      rim: "#92a584",
      accent: "#91ae92",
      mountains: ["#294650", "#243e48", "#203944"],
    },
    {
      id: "ember",
      name: "Amber Aerie",
      motif: "sun",
      platforms: mirroredPlatforms([
        [180, 220, 250],
        [690, 345, 220],
        [65, 475, 270],
        [760, 590, 400],
        [380, 730, 230],
        [810, 855, 300],
      ]),
      sky: ["#291c31", "#704348", "#a47759"],
      rock: "#563b40",
      top: "#8a6250",
      rim: "#e4b776",
      accent: "#f0cb8b",
      mountains: ["#774c4d", "#593b43", "#402e3b"],
    },
    {
      id: "frost",
      name: "Frostglass Peaks",
      motif: "ice",
      platforms: mirroredPlatforms([
        [800, 210, 320],
        [430, 340, 220],
        [70, 495, 260],
        [780, 555, 360],
        [440, 710, 240],
        [70, 855, 300],
      ]),
      sky: ["#101e38", "#27425b", "#587581"],
      rock: "#354f65",
      top: "#789aa8",
      rim: "#c4e8eb",
      accent: "#9de8ed",
      mountains: ["#48667a", "#344f66", "#243e56"],
    },
    {
      id: "crystal",
      name: "Amethyst Ruins",
      motif: "crystal",
      platforms: mirroredPlatforms([
        [110, 230, 230],
        [610, 230, 230],
        [820, 420, 280],
        [340, 515, 280],
        [80, 730, 230],
        [700, 805, 200],
      ]),
      sky: ["#20172f", "#3d3058", "#655477"],
      rock: "#443c5b",
      top: "#786486",
      rim: "#c0a0e0",
      accent: "#d0aff8",
      mountains: ["#514466", "#403651", "#302a42"],
    },
    {
      id: "forest",
      name: "Mossveil Canopy",
      motif: "forest",
      platforms: mirroredPlatforms([
        [720, 220, 480],
        [225, 355, 280],
        [635, 500, 210],
        [60, 630, 240],
        [815, 735, 290],
        [380, 850, 250],
      ]),
      sky: ["#10282c", "#254744", "#536755"],
      rock: "#354a40",
      top: "#667755",
      rim: "#a5c87b",
      accent: "#b5d892",
      mountains: ["#3e5c50", "#304d45", "#233e3b"],
    },
    {
      id: "volcanic",
      name: "Cinder Crown",
      motif: "volcano",
      platforms: mirroredPlatforms([
        [90, 240, 280],
        [790, 290, 340],
        [445, 445, 250],
        [90, 635, 280],
        [820, 660, 280],
        [480, 830, 230],
      ]),
      sky: ["#211c2b", "#513238", "#85503e"],
      rock: "#41353b",
      top: "#695049",
      rim: "#df9566",
      accent: "#ffb475",
      mountains: ["#633d3f", "#492f36", "#342630"],
    },
    {
      id: "swamp",
      name: "Snapwater Marsh",
      motif: "swamp",
      waterY: 960,
      platforms: mirroredPlatforms([
        [120, 250, 260],
        [760, 330, 400],
        [410, 475, 230],
        [90, 650, 240],
        [800, 710, 320],
        [450, 850, 200],
      ])
        .filter((p) => !p.ground)
        .concat([
          { x: 0, y: 960, w: 210, bank: true },
          { x: 1710, y: 960, w: 210, bank: true },
        ]),
      sky: ["#102d34", "#315855", "#79937a"],
      rock: "#3b5044",
      top: "#6d7950",
      rim: "#b4ca7d",
      accent: "#b8e1a1",
      mountains: ["#52796c", "#365f58", "#244a46"],
    },
  ];
  for (const arena of ARENAS) {
    arena.graves = Object.freeze(
      arena.id === "crystal"
        ? [110, 1580, 340, 1300].map((x) => {
            const platform = arena.platforms.find((s) => s.x === x);
            return Object.freeze({
              x: platform.x + platform.w / 2,
              y: platform.y,
            });
          })
        : [],
    );
    arena.platforms.forEach(Object.freeze);
    Object.freeze(arena.platforms);
    Object.freeze(arena);
  }
  Object.freeze(ARENAS);
  class ArenaRotation {
    constructor(rng = Math.random) {
      this.rng = rng;
      this.bag = [];
      this.last = null;
    }
    next() {
      if (!this.bag.length) {
        this.bag = [...ARENAS];
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.min(i, Math.floor(this.rng() * (i + 1)));
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
        if (this.bag[0] === this.last)
          [this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]];
      }
      return (this.last = this.bag.shift());
    }
  }
  const PLATFORM_DEPTH = 35;
  const MAX_LIVES = 5;
  const FLAP_INTERVAL = 0.22,
    BOOST_RECHARGE = 3.5,
    BOOST_DURATION = 0.32;
  const POWERUPS = Object.freeze({ flame: 5, sawblade: 3, rocket: 10 });
  const ROCKET_SPEED = 1.75;
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
  function chooseSpawn(players, rng = Math.random, platforms = PLATFORMS) {
    const candidates = platforms
      .filter((p) => !p.ground && !p.bank)
      .map((p) => ({
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
  function moveAgainstPlatforms(
    p,
    dt,
    events,
    saw = false,
    platforms = PLATFORMS,
  ) {
    p.grounded = false;
    let remaining = dt;
    for (let pass = 0; pass < 4 && remaining > 0; pass++) {
      const dx = p.vx * remaining,
        dy = p.vy * remaining;
      let hit = null;
      for (const platform of platforms) {
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
    p.x = ((p.x % W) + W) % W;
    if (
      p.grounded &&
      !platforms.some(
        (s) => p.y === s.y - 12 && p.x + 10 > s.x && p.x - 10 < s.x + s.w,
      )
    )
      p.grounded = false;
  }
  class Match {
    constructor(seats, mode = "ffa", rng = Math.random, arena = ARENAS[0]) {
      this.arena = arena;
      this.platforms = arena.platforms;
      this.graves = arena.graves;
      this.zombies = [];
      this.nextZombie = 5;
      this.nextZombieId = 0;
      this.volcanoFireballs = [];
      this.eruption = null;
      this.nextEruption = 10;
      this.yetis = [];
      this.snowballs = [];
      this.nextYeti = 6;
      this.piranhas = [];
      this.nextPiranha = 3;
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
        stats: {
          deaths: 0,
          peakSpeed: 0,
          distance: 0,
          airTime: 0,
          groundTime: 0,
          flaps: 0,
          boosts: 0,
          dives: 0,
          bumps: 0,
          clashes: 0,
          feathers: 0,
          powerups: 0,
          flamePickups: 0,
          sawPickups: 0,
          rocketPickups: 0,
          diveKOs: 0,
          powerKOs: 0,
          comebackKOs: 0,
        },
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
      Object.assign(p, chooseSpawn(this.players, this.rng, this.platforms), {
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
        zombieSpeedStacks: 0,
        zombieSpeedTime: 0,
        botExit: null,
        botClimb: null,
        botDive: false,
        botClock: 0,
      });
      this.events.push({ type: "spawn", x: p.x, y: p.y, id: p.id });
    }
    kill(victim, attacker, cause = "contact") {
      if (!victim.alive || victim.invincible > 0) return;
      victim.stats.deaths++;
      victim.alive = false;
      victim.power = null;
      victim.powerTime = 0;
      victim.zombieSpeedStacks = victim.zombieSpeedTime = 0;
      victim.lives--;
      victim.respawn = victim.lives > 0 ? 2.6 : 0;
      if (attacker) {
        attacker.kills++;
        if (cause !== "contact") attacker.stats.powerKOs++;
        if (attacker.diving && cause === "contact") attacker.stats.diveKOs++;
        if (attacker.lives === 1) attacker.stats.comebackKOs++;
        if (attacker.power !== "sawblade") attacker.vy = -210;
      }
      this.events.push({
        type: "death",
        cause,
        attackerId: attacker?.id ?? null,
        kills: attacker?.kills ?? 0,
        eliminated: victim.lives === 0,
        x: victim.x,
        y: victim.y,
        id: victim.id,
      });
    }
    stepVolcano(dt, before) {
      if (this.arena.id !== "volcanic") return;
      if (
        !this.eruption &&
        !this.volcanoFireballs.length &&
        this.time >= this.nextEruption
      ) {
        this.eruption = {
          start: this.time,
          direction: this.rng() < 0.5 ? 1 : -1,
          dropped: 0,
        };
        this.events.push({ type: "eruption-warning" });
      }
      const wave = this.eruption;
      if (
        wave &&
        wave.dropped < 18 &&
        this.time >= wave.start + 1.2 + wave.dropped * 0.5
      ) {
        const column = wave.direction > 0 ? wave.dropped : 17 - wave.dropped;
        this.volcanoFireballs.push({
          x: 100 + column * ((W - 200) / 17),
          y: -20,
          vy: 360,
        });
        wave.dropped++;
      }
      for (const f of this.volcanoFireballs) {
        const oldY = f.y;
        f.vy = Math.min(760, f.vy + 420 * dt);
        const distance = f.vy * dt;
        let hit = null;
        for (const platform of this.platforms) {
          const t = (platform.y - 10 - oldY) / distance;
          if (
            f.x + 10 >= platform.x &&
            f.x - 10 <= platform.x + platform.w &&
            t >= 0 &&
            t <= 1 &&
            (!hit || t < hit.t)
          )
            hit = { t };
        }
        for (const p of this.players) {
          const prev = before[p.id];
          if (!p.alive || !prev.alive || p.invincible > 0) continue;
          const dx = wrapDelta(p.x, prev.x);
          const dy = p.y - prev.y - distance;
          const slab = (origin, delta, low, high) =>
            delta === 0
              ? origin >= low && origin <= high
                ? [-Infinity, Infinity]
                : null
              : [(low - origin) / delta, (high - origin) / delta].sort(
                  (a, b) => a - b,
                );
          const tx = slab(wrapDelta(prev.x, f.x), dx, -20, 20);
          const ty = slab(prev.y - oldY, dy, -22, 31);
          if (!tx || !ty) continue;
          const t = Math.max(0, tx[0], ty[0]);
          if (t <= Math.min(1, tx[1], ty[1]) && (!hit || t < hit.t))
            hit = { t, player: p };
        }
        f.y += distance * (hit ? hit.t : 1);
        if (hit) {
          if (hit.player) this.kill(hit.player, null, "volcano");
          this.events.push({ type: "volcano-impact", x: f.x, y: f.y });
          f.dead = true;
        }
      }
      this.volcanoFireballs = this.volcanoFireballs.filter(
        (f) => !f.dead && f.y < H + 30,
      );
      // A wave includes its last falling fireball, not just its last drop.
      if (wave?.dropped === 18 && !this.volcanoFireballs.length) {
        this.eruption = null;
        this.nextEruption = this.time + 8 + this.rng() * 6;
      }
    }
    stepSnow(dt, before) {
      if (this.arena.id !== "frost") return;
      const clear = (x, y) =>
        !this.players.some(
          (p) =>
            p.alive &&
            Math.abs(wrapDelta(p.x, x)) < 95 &&
            Math.abs(p.y - y) < 65,
        );
      if (this.time >= this.nextYeti) {
        this.nextYeti = this.time + 6 + this.rng() * 5;
        const sites = this.platforms.filter(
          (s) => !s.ground && clear(s.x + s.w / 2, s.y),
        );
        if (sites.length && this.snowballs.length < 6) {
          const s =
            sites[
              Math.min(sites.length - 1, Math.floor(this.rng() * sites.length))
            ];
          this.yetis.push({
            x: s.x + s.w / 2,
            y: s.y,
            age: 0,
            direction: this.rng() < 0.5 ? -1 : 1,
            pushed: false,
          });
        }
      }
      for (const y of this.yetis) {
        y.age += dt;
        if (!y.pushed && y.age >= 1.2) {
          y.pushed = true;
          // Cancel an occupied release instead of materializing a lethal ball on a rider.
          if (clear(y.x, y.y)) {
            this.snowballs.push({
              x: y.x + y.direction * 43,
              y: y.y - 25,
              vx: y.direction * 155,
              vy: 0,
              angle: 0,
            });
          }
        }
      }
      this.yetis = this.yetis.filter((y) => y.age < 2.3);
      for (const b of this.snowballs) {
        const oldX = b.x,
          oldY = b.y;
        const dx = b.vx * dt;
        b.x = (((b.x + dx) % W) + W) % W;
        b.vy += 720 * dt;
        b.y += b.vy * dt;
        b.angle += dx / 25;
        const landing = this.platforms
          .filter(
            (s) =>
              b.x + 20 > s.x &&
              b.x - 20 < s.x + s.w &&
              oldY + 25 <= s.y + 0.01 &&
              b.y + 25 >= s.y,
          )
          .sort((a, b) => a.y - b.y)[0];
        if (landing) {
          b.y = landing.y - 25;
          b.vy = 0;
        }
        for (const p of this.players) {
          const prev = before[p.id];
          if (!p.alive || !prev.alive || p.invincible > 0) continue;
          const slab = (v, d, r) =>
            d === 0
              ? Math.abs(v) <= r
                ? [-Infinity, Infinity]
                : null
              : [(-r - v) / d, (r - v) / d].sort((a, b) => a - b);
          const tx = slab(
            wrapDelta(prev.x, oldX),
            wrapDelta(p.x, prev.x) - dx,
            35,
          );
          const ty = slab(prev.y - 4 - oldY, p.y - prev.y - (b.y - oldY), 37);
          if (
            tx &&
            ty &&
            Math.max(0, tx[0], ty[0]) <= Math.min(1, tx[1], ty[1])
          )
            this.kill(p, null, "snowball");
        }
        if (landing?.ground || b.y > H + 30) {
          b.dead = true;
          this.events.push({ type: "snow-pop", x: b.x, y: b.y });
        }
      }
      this.snowballs = this.snowballs.filter((b) => !b.dead);
    }
    overWater(x) {
      return (
        this.arena.waterY !== undefined &&
        !this.platforms.some((s) => s.bank && x >= s.x && x <= s.x + s.w)
      );
    }
    stepSwamp(dt, before) {
      const water = this.arena.waterY;
      if (water === undefined) return;
      for (const p of this.players) {
        if (!p.alive) continue;
        if (p.y + BODY.feet >= water && this.overWater(p.x)) {
          this.kill(p, null, "water");
          if (p.alive) {
            p.y = water - BODY.feet - 1;
            p.vy = -260;
            p.grounded = false;
          }
        }
      }
      if (this.time >= this.nextPiranha && this.piranhas.length < 4) {
        const targets = this.players.filter(
          (p) => p.alive && p.y > water - 220 && this.overWater(p.x),
        );
        if (targets.length) {
          const p =
            targets[
              Math.min(
                targets.length - 1,
                Math.floor(this.rng() * targets.length),
              )
            ];
          this.piranhas.push({
            x: p.x,
            y: water,
            vy: -855,
            warning: 0.2,
            alive: true,
          });
          this.nextPiranha = this.time + 2.2 + this.rng() * 1.8;
        }
      }
      for (const f of this.piranhas) {
        if (f.warning > 0) {
          f.warning = Math.max(0, f.warning - dt);
          if (!f.warning)
            this.events.push({ type: "splash", x: f.x, y: water });
          continue;
        }
        const oldY = f.y;
        // Faster leap with the same peak height.
        f.vy += 1800 * dt;
        f.y += f.vy * dt;
        // Sweep relative motion so dives and boosts cannot tunnel through a jumping fish.
        for (const p of this.players) {
          const prev = before[p.id];
          if (!p.alive || !prev.alive || p.invincible > 0) continue;
          const slab = (v, d, r) =>
            d === 0
              ? Math.abs(v) <= r
                ? [-Infinity, Infinity]
                : null
              : [(-r - v) / d, (r - v) / d].sort((a, b) => a - b);
          const tx = slab(wrapDelta(prev.x, f.x), wrapDelta(p.x, prev.x), 21);
          const ty = slab(prev.y - 4 - oldY, p.y - prev.y - (f.y - oldY), 25);
          if (
            tx &&
            ty &&
            Math.max(0, tx[0], ty[0]) <= Math.min(1, tx[1], ty[1])
          )
            this.kill(p, null, "piranha");
        }
        if (f.vy > 0 && f.y >= water) {
          f.alive = false;
          this.events.push({ type: "splash", x: f.x, y: water });
        }
      }
      this.piranhas = this.piranhas.filter((f) => f.alive);
    }
    graveOccupied(grave) {
      return this.players.some(
        (p) =>
          p.alive &&
          Math.abs(wrapDelta(p.x, grave.x)) < 30 &&
          Math.abs(p.y + 12 - grave.y) < 28,
      );
    }
    spawnZombies() {
      if (!this.graves.length || this.zombies.length >= 12) return;
      const available = this.graves.filter((g) => !this.graveOccupied(g));
      if (!available.length) return;
      // Each zombie independently picks a clear grave and direction.
      const grave =
        available[
          Math.min(
            available.length - 1,
            Math.floor(this.rng() * available.length),
          )
        ];
      this.zombies.push({
        id: this.nextZombieId++,
        x: grave.x,
        y: grave.y,
        vx: this.rng() < 0.5 ? -72 : 72,
        vy: 0,
        grounded: true,
        fallFrom: grave.y,
        emerge: 0.9,
        age: 0,
        alive: true,
      });
    }
    popZombie(z, reason, player = null) {
      if (!z.alive) return;
      z.alive = false;
      if (player?.alive) {
        const oldScale = 1 + player.zombieSpeedStacks * 0.1;
        player.zombieSpeedStacks++;
        player.zombieSpeedTime = 5;
        player.vx *= (1 + player.zombieSpeedStacks * 0.1) / oldScale;
      }
      this.events.push({
        type: "zombie-pop",
        x: z.x,
        y: z.y - 8,
        reason,
        variant: z.id % 3,
      });
    }
    stepZombies(dt, before) {
      if (!this.graves.length) return;
      if (this.time >= this.nextZombie) {
        this.spawnZombies();
        this.nextZombie = this.time + 2 + this.rng() * 3;
      }
      for (const z of this.zombies) {
        z.age += dt;
        if (z.age > 40) {
          z.alive = false;
          continue;
        }
        if (z.emerge > 0) {
          // Cancel an emergence if a rider arrives before the zombie is active.
          if (this.graveOccupied(z)) {
            z.alive = false;
            continue;
          }
          z.emerge = Math.max(0, z.emerge - dt);
          continue;
        }
        const old = { x: z.x, y: z.y };
        z.x = (((z.x + z.vx * dt) % W) + W) % W;
        if (
          z.grounded &&
          !this.platforms.some(
            (s) => Math.abs(s.y - z.y) < 0.1 && z.x >= s.x && z.x <= s.x + s.w,
          )
        ) {
          z.grounded = false;
          z.fallFrom = z.y;
          z.vy = 0;
        }
        let landing = null;
        if (!z.grounded) {
          z.vy = Math.min(700, z.vy + 650 * dt);
          const nextY = z.y + z.vy * dt;
          landing = this.platforms
            .filter(
              (s) =>
                s.y > old.y &&
                s.y <= nextY &&
                (() => {
                  const t = (s.y - old.y) / (nextY - old.y || 1);
                  const x = (((old.x + z.vx * dt * t) % W) + W) % W;
                  return x >= s.x && x <= s.x + s.w;
                })(),
            )
            .sort((a, b) => a.y - b.y)[0];
          z.y = landing ? landing.y : nextY;
        }
        // Sweep relative motion, including fast dives and the horizontal wrap seam.
        for (const p of this.players) {
          const prev = before[p.id];
          if (!p.alive || !prev.alive || !z.alive) continue;
          if (
            p.power === "flame" &&
            this.fireballs(p).some(
              (f) => Math.hypot(wrapDelta(f.x, z.x), f.y - (z.y - 8)) < 18,
            )
          ) {
            this.popZombie(z, "flame", p);
            continue;
          }
          const rx = wrapDelta(prev.x, old.x),
            ry = prev.y - 4 - (old.y - 8);
          const dx = wrapDelta(p.x, prev.x) - wrapDelta(z.x, old.x),
            dy = p.y - prev.y - (z.y - old.y);
          const slab = (v, d, r) =>
            d === 0
              ? Math.abs(v) <= r
                ? [-Infinity, Infinity]
                : null
              : [(-r - v) / d, (r - v) / d].sort((a, b) => a - b);
          const tx = slab(rx, dx, 17),
            ty = slab(ry, dy, 22);
          if (
            !tx ||
            !ty ||
            Math.max(0, tx[0], ty[0]) > Math.min(1, tx[1], ty[1])
          )
            continue;
          const contactTime = Math.max(0, tx[0], ty[0]);
          // Compare standing anchors, so same-floor contact is never a stomp.
          const stomp = old.y - 12 - prev.y - dy * contactTime > 7;
          const smash = p.boosting || p.power === "sawblade";
          if (stomp || smash) {
            this.popZombie(z, smash ? "boost" : "stomp", p);
            if (stomp && !smash) {
              p.vy = -210;
              p.grounded = false;
            }
          } else if (p.invincible <= 0) this.kill(p, null, "zombie");
        }
        for (const f of this.projectiles) {
          if (!z.alive) break;
          const dx = f.x - f.oldX,
            dy = f.y - f.oldY;
          const t = clamp(
            ((z.x - f.oldX) * dx + (z.y - 8 - f.oldY) * dy) /
              (dx * dx + dy * dy || 1),
            0,
            1,
          );
          if (Math.hypot(z.x - f.oldX - t * dx, z.y - 8 - f.oldY - t * dy) < 18)
            this.popZombie(z, "flame", this.players[f.owner]);
        }
        if (landing && z.alive) {
          if (landing.y - z.fallFrom >= 320) this.popZombie(z, "fall");
          else {
            z.grounded = true;
            z.vy = 0;
            z.fallFrom = z.y;
          }
        }
      }
      this.zombies = this.zombies.filter((z) => z.alive);
    }
    equip(p, kind) {
      if (!POWERUPS[kind] || !p.alive) return;
      p.stats.powerups++;
      p.stats[
        {
          flame: "flamePickups",
          sawblade: "sawPickups",
          rocket: "rocketPickups",
        }[kind]
      ]++;
      const wasRocket = p.power === "rocket";
      if (p.boostTime > 0 && wasRocket !== (kind === "rocket"))
        p.vx *= kind === "rocket" ? ROCKET_SPEED : 1 / ROCKET_SPEED;
      p.power = kind;
      p.powerTime = POWERUPS[kind];
      if (kind === "rocket") p.boostCharge = 1;
      if (kind === "sawblade") {
        p.boostTime = 0;
        p.vx = p.facing * 900 * (1 + p.zombieSpeedStacks * 0.1);
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
            if (!hits.has(q.id)) hits.set(q.id, { owner: p, cause: p.power });
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
            if (!hits.has(q.id)) hits.set(q.id, { owner, cause: "flame" });
        }
      }
      for (const [id, hit] of hits)
        this.kill(this.players[id], hit.owner, hit.cause);
    }
    spawnPower(randomLocation = false) {
      if (this.winner) return;
      let spot;
      if (randomLocation) {
        const platform =
          this.platforms[
            Math.min(
              this.platforms.length - 2,
              Math.floor(this.rng() * (this.platforms.length - 1)),
            )
          ];
        spot = {
          x: platform.x + 30 + this.rng() * (platform.w - 60),
          y: platform.y - 12,
        };
      } else spot = chooseSpawn(this.players, this.rng, this.platforms);
      const kinds = Object.keys(POWERUPS);
      this.powerPickup = {
        x: spot.x,
        y: spot.y - 14,
        ttl: 12,
        kind: kinds[
          Math.min(kinds.length - 1, Math.floor(this.rng() * kinds.length))
        ],
      };
      this.nextPower = this.time + 25 + this.rng() * 15;
      this.events.push({ type: "power-appeared", kind: this.powerPickup.kind });
    }
    step(dt, inputs = []) {
      if (this.winner) return;
      const eventStart = this.events.length;
      const before = this.players.map((p) => ({
        x: p.x,
        y: p.y,
        alive: p.alive,
      }));
      this.time += dt;
      for (const p of this.players) {
        if (!p.alive) {
          if (p.lives > 0) {
            p.respawn -= dt;
            if (p.respawn <= 0) this.spawn(p);
          }
          continue;
        }
        if (p.zombieSpeedTime > 0) {
          p.zombieSpeedTime = Math.max(0, p.zombieSpeedTime - dt);
          if (!p.zombieSpeedTime) {
            p.vx /= 1 + p.zombieSpeedStacks * 0.1;
            p.zombieSpeedStacks = 0;
          }
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
          moveAgainstPlatforms(p, dt, this.events, true, this.platforms);
          if (p.y < 120 || (this.arena.waterY === undefined && p.y > 984)) {
            p.y = clamp(
              p.y,
              120,
              this.arena.waterY === undefined ? 984 : Infinity,
            );
            p.vy *= -1;
          }
          continue;
        }
        const speedScale =
          (p.power === "rocket" ? ROCKET_SPEED : 1) *
          (1 + p.zombieSpeedStacks * 0.1);
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
        moveAgainstPlatforms(p, dt, this.events, false, this.platforms);
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
      for (const p of this.players) {
        const old = before[p.id];
        if (!old.alive || !p.alive) continue;
        p.stats.distance += Math.hypot(wrapDelta(p.x, old.x), p.y - old.y);
        p.stats.peakSpeed = Math.max(p.stats.peakSpeed, Math.hypot(p.vx, p.vy));
        p.stats[p.grounded ? "groundTime" : "airTime"] += dt;
      }
      for (const f of this.projectiles) {
        f.oldX = f.x;
        f.oldY = f.y;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.ttl -= dt;
      }
      this.powerHits();
      this.stepZombies(dt, before);
      this.stepVolcano(dt, before);
      this.stepSwamp(dt, before);
      this.stepSnow(dt, before);
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
              a.stats.clashes++;
              b.stats.clashes++;
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
            p.stats.feathers++;
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
        const s = chooseSpawn(this.players, this.rng, this.platforms);
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
      if (!this.powerPickup && this.time >= this.nextPower) this.spawnPower();
      for (let i = eventStart; i < this.events.length; i++) {
        const event = this.events[i];
        const metric = {
          flap: "flaps",
          boost: "boosts",
          dive: "dives",
          bump: "bumps",
        }[event.type];
        if (metric && this.players[event.id])
          this.players[event.id].stats[metric]++;
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
      const roof = match.platforms
        .filter(
          (s) =>
            !s.ground &&
            p.y - 21 >= s.y + PLATFORM_DEPTH &&
            p.y - s.y < 200 &&
            p.x > s.x - 20 &&
            p.x < s.x + s.w + 20,
        )
        .sort((a, b) => b.y - a.y)[0];
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
      const platform = match.platforms.find(
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
      !match.platforms.some(
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
      flap: match.arena.waterY && p.y > 790 ? false : flap,
      flapHeld: !!match.arena.waterY && p.y > 790,
      dive: match.arena.waterY && p.y > 750 ? false : dive,
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
      removeBot: pressed(5),
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
    ARENAS,
    ArenaRotation,
    PLATFORM_DEPTH,
    Match,
    chooseSpawn,
    wrapDelta,
    botInput,
    gamepadState,
    edges,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.OneBigSky = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
