/* Round accounting and evidence-based end-of-match awards. */
(function (root) {
  "use strict";
  const AWARD_GROUPS = [
    [
      "peakSpeed",
      "Top speed",
      "px/s",
      [
        "FASTEST",
        "SPEED DEMON",
        "SONIC BOOM",
        "BLUR OF FEATHERS",
        "SKY MISSILE",
      ],
    ],
    [
      "distance",
      "Distance flown or walked",
      "px",
      [
        "GLOBETROTTER",
        "SKY TOURIST",
        "LONG HAUL",
        "MILE HIGH CLUB",
        "HORIZON CHASER",
      ],
    ],
    [
      "airTime",
      "Time airborne",
      "s",
      [
        "AIRBORNE ACE",
        "CLOUD DWELLER",
        "NEVER LANDS",
        "SKY TENANT",
        "WING COMMANDER",
      ],
    ],
    [
      "groundTime",
      "Time on platforms",
      "s",
      [
        "LANDLUBBER",
        "RUNWAY REGULAR",
        "PERCH PATROL",
        "GROUND CREW",
        "ISLAND HOPPER",
      ],
    ],
    [
      "flaps",
      "Flaps",
      "",
      [
        "FLAP HAPPY",
        "WING MACHINE",
        "CARDIO CHAMP",
        "FEATHER ENGINE",
        "HUMMINGBIRD ENERGY",
      ],
    ],
    [
      "boosts",
      "Boosts used",
      "",
      [
        "AFTERBURNER",
        "TURBO ADDICT",
        "BOOST JUNKIE",
        "FULL THROTTLE",
        "EXPRESS DELIVERY",
      ],
    ],
    [
      "dives",
      "Dives started",
      "",
      [
        "DIVE BOMBER",
        "GRAVITY FAN",
        "NOSE FIRST",
        "METEOR SHOWER",
        "FLOOR INSPECTOR",
      ],
    ],
    [
      "bumps",
      "Platform rebounds",
      "",
      [
        "PINBALL WIZARD",
        "WALL TESTER",
        "BOUNCE HOUSE",
        "ROCK SOLID HEAD",
        "RICOCHET ROYALTY",
      ],
    ],
    [
      "clashes",
      "Tied-height clashes",
      "",
      [
        "HEAD BUTTER",
        "STUBBORN STREAK",
        "TRAFFIC JAM",
        "BUMPER BIRD",
        "PERSONAL SPACE INVADER",
      ],
    ],
    [
      "feathers",
      "Golden feathers collected",
      "",
      [
        "GOLD DIGGER",
        "FEATHER MAGNET",
        "TREASURE HUNTER",
        "GOLD RUSH",
        "SHINY OBJECT EXPERT",
      ],
    ],
    [
      "powerups",
      "Power-ups collected",
      "",
      [
        "POWER HUNGRY",
        "MYSTERY SHOPPER",
        "LOOT GOBLIN",
        "BUFF BUFF",
        "UPGRADE ENTHUSIAST",
      ],
    ],
    [
      "flamePickups",
      "Flame pickups",
      "",
      [
        "FIRE STARTER",
        "HOT WINGS",
        "INFERNO FAN",
        "EXTRA CRISPY",
        "RING OF FIRE",
      ],
    ],
    [
      "sawPickups",
      "Sawblade pickups",
      "",
      [
        "BUZZ SAW",
        "SHARP OPERATOR",
        "SPIN DOCTOR",
        "CUTTING EDGE",
        "SAWDUST MAKER",
      ],
    ],
    [
      "rocketPickups",
      "Rocket pickups",
      "",
      [
        "ROCKET SCIENTIST",
        "SPACE CADET",
        "LAUNCH CONTROL",
        "JET STREAM",
        "ORBITAL MENACE",
      ],
    ],
    [
      "kills",
      "Total knockouts",
      "",
      [
        "KO KING",
        "FLOCK BREAKER",
        "TOP PREDATOR",
        "FEATHERWEIGHT HEAVYWEIGHT",
        "SKY SHERIFF",
      ],
    ],
    [
      "diveKOs",
      "Dive knockouts",
      "",
      [
        "DEATH FROM ABOVE",
        "PRECISION STRIKE",
        "TALON DROP",
        "HIGH GROUND HERO",
        "FALLING STAR",
      ],
    ],
    [
      "powerKOs",
      "Power-up knockouts",
      "",
      [
        "WEAPONS EXPERT",
        "SPECIAL DELIVERY",
        "SUPERPOWER SHOWOFF",
        "DANGER ZONE",
        "ARCADE MENACE",
      ],
    ],
    [
      "comebackKOs",
      "Knockouts on the last life",
      "",
      [
        "CLUTCH CLAWS",
        "LAST LIFE LEGEND",
        "CORNERED CREATURE",
        "NEVER SAY DIE",
        "NERVES OF STEEL",
      ],
    ],
    [
      "chaos",
      "Boosts, dives and rebounds",
      "",
      [
        "MOST INSANE",
        "ABSOLUTE CHAOS",
        "WILD CARD",
        "LOOSE CANNON",
        "UNLICENSED PILOT",
      ],
    ],
    [
      "rounds",
      "Rounds completed",
      "",
      [
        "SKY REGULAR",
        "FLOCK ORIGINAL",
        "ARENA VETERAN",
        "FEATHERED CONTENDER",
        "IN IT TO WING IT",
      ],
    ],
  ];
  const AWARDS = AWARD_GROUPS.flatMap(([metric, description, unit, labels]) =>
    labels.map((label) => Object.freeze({ label, metric, description, unit })),
  );
  function chooseAwards(players, rng = Math.random) {
    const used = new Set();
    return players.map((p) => {
      const eligible = AWARDS.filter(
        (a) =>
          !used.has(a.label) &&
          p.stats[a.metric] > 0 &&
          p.stats[a.metric] >=
            Math.max(...players.map((q) => q.stats[a.metric] || 0)),
      );
      // Participation provides five distinct truthful fallbacks even in a scoreless match.
      const pool = eligible.filter((a) => a.metric !== "rounds");
      const choices = pool.length ? pool : eligible;
      if (!choices.length) return null;
      const award =
        choices[
          Math.min(choices.length - 1, Math.floor(rng() * choices.length))
        ];
      used.add(award.label);
      const value = Math.round(p.stats[award.metric]);
      return {
        ...award,
        value,
        reason: `${award.description}: ${value}${award.unit ? " " + award.unit : ""}`,
      };
    });
  }
  class MatchSeries {
    constructor(seats, mode = "ffa", rng = Math.random) {
      this.seats = seats.map((s) => ({ ...s }));
      this.mode = mode;
      this.rng = rng;
      this.rounds = [];
      this.players = seats.map((s, id) => ({
        ...s,
        id,
        kills: 0,
        wins: 0,
        stats: {},
      }));
      this.teamWins = [0, 0];
      this.winner = null;
      this.awards = null;
      this.recorded = new WeakSet();
    }
    recordRound(round) {
      if (!round.winner || this.winner || this.recorded.has(round))
        return false;
      if (
        round.mode !== this.mode ||
        round.players.length !== this.players.length
      )
        throw new Error("Round roster does not match this match");
      this.recorded.add(round);
      const result = { ...round.winner };
      for (const p of round.players) {
        const total = this.players[p.id];
        total.kills += p.kills;
        if (
          !result.draw &&
          (this.mode === "teams" ? p.team === result.team : p.id === result.id)
        )
          total.wins++;
        for (const [key, value] of Object.entries(p.stats || {})) {
          total.stats[key] =
            key === "peakSpeed"
              ? Math.max(total.stats[key] || 0, value)
              : (total.stats[key] || 0) + value;
        }
        total.stats.kills = total.kills;
        total.stats.rounds = this.rounds.length + 1;
        total.stats.chaos =
          (total.stats.boosts || 0) +
          (total.stats.dives || 0) +
          (total.stats.bumps || 0);
      }
      this.rounds.push({
        result,
        time: round.time,
        players: round.players.map((p) => ({
          id: p.id,
          kills: p.kills,
          lives: p.lives,
        })),
      });
      if (!result.draw) {
        if (this.mode === "teams") {
          this.teamWins[result.team]++;
          if (this.teamWins[result.team] >= 3) this.winner = result;
        } else if (this.players[result.id].wins >= 3) this.winner = result;
      }
      if (this.winner) this.awards = chooseAwards(this.players, this.rng);
      return true;
    }
  }
  function rankPlayers(players) {
    const sorted = [...players].sort(
      (a, b) => b.wins - a.wins || b.kills - a.kills,
    );
    let rank = 0;
    return sorted.map((p, i) => {
      if (
        !i ||
        p.wins !== sorted[i - 1].wins ||
        p.kills !== sorted[i - 1].kills
      )
        rank = i + 1;
      return { ...p, rank };
    });
  }
  const api = {
    MatchSeries,
    AWARDS: Object.freeze(AWARDS),
    chooseAwards,
    rankPlayers,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FeatherfallSeries = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
