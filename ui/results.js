/* results: presentation module. Dependencies: $, TEAMS, birds, drawPortrait, playerName, powerColor, rankPlayers, show, tone. */
(function (root) {
  "use strict";
  root.OneBigSkyUI ||= {};
  root.OneBigSkyUI.results = function createResults(state, deps) {
    const koLabel = (count) => `${count} ${count === 1 ? "KO" : "KOs"}`;
    function commentaryMarkup(text) {
      const escape = (value) =>
        value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      const names = (state.match?.players || []).map((p) => ({
        name: deps.playerName(p),
        color: deps.birds[p.character].color,
      }));
      let result = "",
        offset = 0;
      while (offset < text.length) {
        const hits = names
          .map((n) => ({ ...n, index: text.indexOf(n.name, offset) }))
          .filter((n) => n.index >= 0)
          .sort((a, b) => a.index - b.index);
        if (!hits.length) {
          result += escape(text.slice(offset));
          break;
        }
        const hit = hits[0];
        result +=
          escape(text.slice(offset, hit.index)) +
          `<span style="color:${hit.color}">${escape(hit.name)}</span>`;
        offset = hit.index + hit.name.length;
      }
      return result;
    }
    function updateHud() {
      if (!state.match) return;
      deps.$("players-hud").innerHTML = state.match.players
        .map((p) => {
          const b = deps.birds[p.character];
          const total = state.series.players[p.id];
          const kills =
            total.kills +
            (state.series.recorded.has(state.match) ? 0 : p.kills);
          return `<div class="hud-player ${p.lives === 0 ? "out" : ""} ${state.mode === "teams" ? "team-hud" : ""}" style="--bird:${b.color};--team:${deps.TEAMS[p.team].color}">
          <div class="hud-heading"><div class="name">${deps.playerName(p)}${state.mode === "teams" ? ` · ${p.team === 0 ? "SUN" : "MOON"}` : ""}</div><div class="hud-stats"><span class="ko-count">${koLabel(kills)}</span><span class="win-count">${total.wins} ${total.wins === 1 ? "WIN" : "WINS"}</span></div></div>
          <div class="hud-vitals"><div class="lives" aria-label="${p.lives} lives">${p.lives ? Array.from({ length: p.lives }, () => '<i class="pixel-heart" aria-hidden="true"></i>').join("") : "✕ OUT"}</div><div class="hud-flight">${!p.alive ? (p.lives ? `<span class="meta">RETURNING IN ${Math.ceil(p.respawn)}...</span>` : "") : `${p.power ? `<span class="power-timer" aria-label="Power-up time remaining" style="color:${deps.powerColor[p.power]}">${Math.ceil(p.powerTime)}s</span>` : ""}<div class="boost-meter ${p.boostCharge >= 1 ? "charged" : ""}" role="progressbar" aria-label="${deps.playerName(p)} boost" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.boostCharge * 100)}"><i style="width:${p.boostCharge * 100}%"></i><span>${p.zombieSpeedStacks ? `+${p.zombieSpeedStacks * 10}% · ${Math.ceil(p.zombieSpeedTime)}s` : p.power === "rocket" ? "UNLIMITED BOOST" : p.boostCharge >= 1 ? "BOOST READY" : "BOOST"}</span></div>`}</div></div>
        </div>`;
        })
        .join("");
      const time = Math.floor(state.match.time);
      deps.$("match-time").textContent =
        `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
      deps.$("match-mode").textContent =
        `ROUND ${state.series.rounds.length + (state.series.recorded.has(state.match) ? 0 : 1)} · FIRST TO 3`;
    }
    function showResults(final) {
      state.resultsMode = final ? "match" : "round";
      updateHud();
      deps.show("results");
      deps.tone(440, 0.6, "triangle", 0.06, 880);
      const result = final ? state.series.winner : state.match.winner,
        winner = state.match.players.find((p) => p.id === result.id),
        teamName = result.team === 0 ? "Sun team" : "Moon team";
      deps.$("results-heading").textContent = final
        ? "MATCH TOTALS"
        : `ROUND ${state.series.rounds.length} RESULTS`;
      deps.$("winner-title").textContent = result.draw
        ? "A sky without a winner."
        : state.mode === "teams"
          ? `${teamName} wins!`
          : `${deps.playerName(winner)} wins!`;
      deps.$("winner-subtitle").textContent = final
        ? `First to three. ${state.series.rounds.length} rounds of flying mayhem.`
        : result.draw
          ? "No win awarded. The next round starts fresh."
          : state.series.winner
            ? "Three wins! Match totals and awards are up next."
            : "Round complete. First to three wins takes the match.";
      deps.$("rematch").textContent = final
        ? "PLAY AGAIN >"
        : state.series.winner
          ? "MATCH TOTALS >"
          : "NEXT ROUND >";
      deps.$("scoreboard").className = final ? "match-totals" : "round-totals";
      const rows = final
        ? deps.rankPlayers(state.series.players)
        : state.match.players;
      deps.$("scoreboard").innerHTML = [...rows]
        .sort((a, b) =>
          final
            ? b.wins - a.wins || b.kills - a.kills
            : b.lives - a.lives || b.kills - a.kills,
        )
        .map((p) => {
          const total = state.series.players[p.id],
            award = final ? state.series.awards[p.id] : null;
          return `<div class="score-row"><div class="score-line"><span style="color:${deps.birds[p.character].color}">${final ? `<b class="final-rank" aria-label="Rank ${p.rank}"><span class="rank-prefix" aria-hidden="true">#</span>${p.rank}</b> ` : ""}${deps.playerName(p)}${state.mode === "teams" ? ` · ${deps.TEAMS[p.team].name}` : ""}</span><span>${koLabel(p.kills)} · ${total.wins} ${total.wins === 1 ? "WIN" : "WINS"}${final ? "" : ` · ${p.lives} ${p.lives === 1 ? "LIFE" : "LIVES"} LEFT`}</span></div>${award ? `<div class="award"><strong>${award.label}</strong><small>${award.reason}</small></div>` : ""}</div>`;
        })
        .join("");
      const c = deps.$("winner-bird").getContext("2d");
      c.clearRect(0, 0, 180, 100);
      const winners = result.draw
        ? []
        : state.mode === "teams"
          ? state.match.players.filter((p) => p.team === result.team)
          : [winner];
      winners.forEach((p, i) => {
        const portrait = document.createElement("canvas");
        portrait.width = 320;
        portrait.height = 168;
        deps.drawPortrait(portrait.getContext("2d"), p.character);
        const slotWidth = 180 / winners.length;
        const width = Math.min(133, slotWidth);
        const height = (width * 168) / 224;
        c.imageSmoothingEnabled = false;
        c.drawImage(
          portrait,
          48,
          0,
          224,
          168,
          slotWidth * (i + 0.5) - width / 2,
          (100 - height) / 2,
          width,
          height,
        );
      });
    }

    return { updateHud, showResults, commentaryMarkup };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
