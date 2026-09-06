const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Match } = require("../engine.js");
const { MatchSeries, AWARDS, chooseAwards } = require("../match-series.js");
const roster = Array.from({ length: 4 }, (_, i) => ({
  slot: i,
  character: i,
  team: i % 2,
  kind: "keyboard",
  source: i,
}));
function round(series, result, kills = [2, 1, 0, 0]) {
  const m = new Match(series.seats, series.mode, () => 0.5);
  m.winner = result;
  m.players.forEach((p, i) => {
    p.kills = kills[i] || 0;
    p.stats.boosts = i + 1;
    p.stats.peakSpeed = 300 + i * 100;
  });
  return m;
}
test("first to three accumulates all players across rounds and counts each result once", () => {
  const s = new MatchSeries(roster, "ffa", () => 0.5);
  for (const id of [0, 1, 0, 2, 0]) {
    const m = round(s, { id, draw: false });
    assert.equal(s.recordRound(m), true);
    assert.equal(s.recordRound(m), false);
  }
  assert.equal(s.winner.id, 0);
  assert.deepEqual(
    s.players.map((p) => p.wins),
    [3, 1, 1, 0],
  );
  assert.deepEqual(
    s.players.map((p) => p.kills),
    [10, 5, 0, 0],
  );
  assert.equal(s.players[0].stats.boosts, 5);
  assert.equal(s.players[0].stats.peakSpeed, 300);
  assert.equal(s.rounds.length, 5);
  assert.equal(s.recordRound(round(s, { id: 1, draw: false })), false);
  assert.equal(s.awards.length, 4);
});
test("draws retain KOs and stats but award no wins", () => {
  const s = new MatchSeries(roster);
  s.recordRound(round(s, { id: null, draw: true }, [1, 1, 1, 1]));
  assert.deepEqual(
    s.players.map((p) => p.wins),
    [0, 0, 0, 0],
  );
  assert.deepEqual(
    s.players.map((p) => p.kills),
    [1, 1, 1, 1],
  );
  assert.equal(s.winner, null);
  assert.equal(s.rounds.length, 1);
});
test("team round wins credit every teammate even if eliminated", () => {
  const s = new MatchSeries(roster, "teams");
  for (let i = 0; i < 3; i++) {
    const m = round(s, { team: 1, draw: false });
    m.players[3].lives = 0;
    s.recordRound(m);
  }
  assert.deepEqual(s.teamWins, [0, 3]);
  assert.deepEqual(
    s.players.map((p) => p.wins),
    [0, 3, 0, 3],
  );
  assert.equal(s.winner.team, 1);
});
test("unfinished rounds are ignored and a new match starts from zero", () => {
  const s = new MatchSeries(roster);
  assert.equal(s.recordRound(new Match(roster)), false);
  assert.equal(s.rounds.length, 0);
  assert.ok(s.players.every((p) => p.kills === 0 && p.wins === 0));
  assert.equal(s.awards, null);
});
test("100 unique awards use actual qualifying leader metrics and avoid duplicate labels", () => {
  assert.equal(AWARDS.length, 100);
  assert.equal(new Set(AWARDS.map((a) => a.label)).size, 100);
  const players = roster.map((p, i) => ({
    ...p,
    stats: {
      rounds: 3,
      peakSpeed: i === 0 ? 900 : 300,
      kills: i === 1 ? 12 : 0,
      dives: i === 2 ? 20 : 0,
    },
  }));
  for (const random of [0, 0.2, 0.5, 0.8, 0.999]) {
    const awards = chooseAwards(players, () => random);
    assert.equal(new Set(awards.map((a) => a.label)).size, 4);
    awards.forEach((a, i) => {
      assert.ok(players[i].stats[a.metric] > 0);
      assert.equal(a.value, players[i].stats[a.metric]);
      assert.ok(
        players[i].stats[a.metric] >=
          Math.max(...players.map((p) => p.stats[a.metric] || 0)),
      );
      assert.ok(a.reason.includes(String(a.value)));
    });
  }
});
test("scoreless matches still give four distinct truthful participation awards", () => {
  const awards = chooseAwards(
    roster.map((p) => ({ ...p, stats: { rounds: 3 } })),
    () => 0,
  );
  assert.equal(new Set(awards.map((a) => a.label)).size, 4);
  assert.ok(awards.every((a) => a.metric === "rounds" && a.value === 3));
});

test("final ranks use wins then KOs, sharing exact ties and skipping occupied places", () => {
  const { rankPlayers } = require("../match-series.js");
  const players = [
    { id: 0, wins: 2, kills: 10 },
    { id: 1, wins: 0, kills: 30 },
    { id: 2, wins: 3, kills: 1 },
    { id: 3, wins: 2, kills: 10 },
  ];
  const ranked = rankPlayers(players);
  assert.deepEqual(
    ranked.map((p) => [p.id, p.rank]),
    [
      [2, 1],
      [0, 2],
      [3, 2],
      [1, 4],
    ],
  );
  assert.ok(players.every((p) => p.rank === undefined));
  assert.deepEqual(
    rankPlayers([
      { wins: 2, kills: 4 },
      { wins: 2, kills: 5 },
    ]).map((p) => [p.kills, p.rank]),
    [
      [5, 1],
      [4, 2],
    ],
  );
  assert.deepEqual(
    rankPlayers(Array.from({ length: 4 }, () => ({ wins: 1, kills: 3 }))).map(
      (p) => p.rank,
    ),
    [1, 1, 1, 1],
  );
});
