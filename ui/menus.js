/* menus: presentation module. Dependencies: $, TEAMS, announce, audioUnlock, birds, continueResults, drawBird, drawPortrait, keys, pause, resume, sound, startMatch, tone. */
(function (root) {
  "use strict";
  root.OneBigSkyUI ||= {};
  root.OneBigSkyUI.menus = function createMenus(state, deps) {
    function show(next) {
      if (next === "menu") state.seats = [null, null, null, null];
      state.screen = next;
      state.menuIndex = 0;
      for (const id of ["menu", "lobby", "mode-screen", "pause", "results"])
        deps.$(id).hidden = next !== id;
      const inArena = [
        "match",
        "countdown",
        "ending",
        "pause",
        "results",
      ].includes(next);
      deps.$("hud").hidden = !inArena;
      document.body.classList.toggle("playing", inArena);
      deps.$("announcement").textContent = "";
      deps.$("announcement").className = "";
      state.pressed.clear();
      state.tapped.clear();
      state.pendingFlaps.clear();
      state.pendingBoosts.clear();
      state.accumulator = 0;
      if (next === "lobby") {
        renderSeats();
        deps.$("launch").focus();
      }
      if (next === "menu") deps.$("start").focus();
      if (next === "pause") deps.$("resume").focus();
      if (next === "results") deps.$("rematch").focus();
      refreshMenuFocus();
    }
    function menuOptions() {
      if (state.screen === "menu") return ["start", "sound", "fullscreen"];
      if (state.screen === "pause")
        return ["resume", "pause-sound", "pause-fullscreen", "quit"];
      if (state.screen === "results") return ["rematch", "change-players"];
      return [];
    }
    function refreshMenuFocus() {
      for (const id of [
        "start",
        "sound",
        "fullscreen",
        "resume",
        "pause-sound",
        "pause-fullscreen",
        "quit",
        "rematch",
        "change-players",
      ])
        deps.$(id).setAttribute("data-pad-focus", "");
      const options = menuOptions();
      if (options.length)
        deps
          .$(options[state.menuIndex % options.length])
          .setAttribute("data-pad-focus", "SELECT");
    }
    function navigateMenu(direction) {
      const options = menuOptions();
      if (!options.length) return;
      state.menuIndex =
        (state.menuIndex + direction + options.length) % options.length;
      refreshMenuFocus();
      deps.$(options[state.menuIndex]).focus();
    }
    function selectMenu() {
      const id = menuOptions()[state.menuIndex];
      if (id) deps.$(id).click();
    }
    const allReady = () =>
      state.seats.filter(Boolean).length >= 2 &&
      state.seats.filter(Boolean).every((s) => s.ready);
    function balanceBots() {
      const counts = [0, 0];
      state.seats.forEach((s) => {
        if (s && s.kind !== "bot") counts[s.team]++;
      });
      state.seats.forEach((s) => {
        if (s?.kind === "bot") {
          s.team = counts[0] <= counts[1] ? 0 : 1;
          counts[s.team]++;
        }
      });
    }
    function randomBotCharacters() {
      const used = new Set(
        state.seats
          .filter((s) => s && s.kind !== "bot")
          .map((s) => s.character),
      );
      state.seats.forEach((s) => {
        if (s?.kind !== "bot") return;
        if (used.has(s.character)) {
          const choices = deps.birds
            .map((_, i) => i)
            .filter((i) => !used.has(i));
          s.character = choices[Math.floor(Math.random() * choices.length)];
        }
        used.add(s.character);
      });
    }
    function removeBot() {
      const bots = state.seats.filter((s) => s?.kind === "bot");
      const last = bots.sort((a, b) => b.added - a.added)[0];
      if (last) state.seats[state.seats.indexOf(last)] = null;
      renderSeats();
    }
    function ready(slot) {
      if (!state.seats[slot] || state.seats[slot].kind === "bot") return;
      state.seats[slot].ready = !state.seats[slot].ready;
      renderSeats();
    }
    function lobbySelect(slot) {
      if (allReady()) {
        openMode();
        return;
      }
      if (state.seats[slot] && !state.seats[slot].ready) ready(slot);
    }
    function join(kind, source, slot = state.seats.findIndex((s) => !s)) {
      if (
        slot < 0 ||
        state.seats[slot] ||
        state.seats.some(
          (s) => s && s.kind === kind && s.source === source && kind !== "bot",
        )
      )
        return;
      const used = new Set(state.seats.filter(Boolean).map((s) => s.character));
      const choices = deps.birds.map((_, i) => i).filter((i) => !used.has(i));
      state.seats[slot] = {
        kind,
        source,
        character:
          kind === "bot"
            ? choices[Math.floor(Math.random() * choices.length)]
            : slot % deps.birds.length,
        team: slot % 2,
        ready: kind === "bot",
        added: ++state.botSerial,
      };
      randomBotCharacters();
      deps.tone(460, 0.1, "triangle", 0.05, 700);
      renderSeats();
    }
    const keyName = (code) =>
      code
        .replace("Key", "")
        .replace("Arrow", "")
        .replace("ShiftRight", "R.SHIFT")
        .toUpperCase();
    function rotate(slot, direction) {
      const s = state.seats[slot];
      if (!s || s.ready) return;
      const row = Math.floor(s.character / 4),
        col = s.character % 4;
      s.character =
        Math.abs(direction) === 4
          ? (1 - row) * 4 + col
          : s.kind === "keyboard"
            ? (s.character + direction + deps.birds.length) % deps.birds.length
            : row * 4 + ((col + direction + 4) % 4);
      randomBotCharacters();
      renderSeats();
    }
    function canStart() {
      return (
        allReady() &&
        state.selectedMode !== null &&
        (state.mode !== "teams" ||
          new Set(state.seats.filter(Boolean).map((s) => s.team)).size === 2)
      );
    }
    function openMode() {
      if (!allReady()) return;
      state.selectedMode = null;
      state.modeCursor = 0;
      show("mode-screen");
      renderMode();
    }
    function backMode() {
      if (state.selectedMode !== null) {
        state.modeCursor = state.selectedMode === "teams" ? 1 : 0;
        state.selectedMode = null;
        renderMode();
      } else show("lobby");
    }
    function backLobby(slot) {
      if (state.seats[slot]?.ready) {
        state.seats[slot].ready = false;
        renderSeats();
      } else if (slot === 0) show("menu");
      else if (state.seats[slot]) {
        state.seats[slot] = null;
        renderSeats();
      }
    }
    function moveMode(slot, direction) {
      if (state.selectedMode === "teams") moveTeam(slot, direction);
      else if (state.selectedMode === null) {
        state.modeCursor = direction < 0 ? 0 : 1;
        renderMode();
      }
    }
    function chooseMode(value) {
      state.selectedMode = state.mode = value;
      if (value === "teams") balanceBots();
      state.modeCursor = canStart() ? 2 : 1;
      renderMode();
    }
    function moveTeam(slot, direction) {
      if (
        state.mode !== "teams" ||
        state.selectedMode !== "teams" ||
        !state.seats[slot]
      )
        return;
      state.seats[slot].team = direction < 0 ? 0 : 1;
      balanceBots();
      state.modeCursor = canStart() ? 2 : 1;
      renderMode();
    }
    function selectMode() {
      if (state.modeCursor === 2) {
        if (canStart()) deps.startMatch();
      } else chooseMode(state.modeCursor === 0 ? "ffa" : "teams");
    }
    function renderMode() {
      deps
        .$("mode-ffa")
        .setAttribute("aria-pressed", state.selectedMode === "ffa");
      deps
        .$("mode-teams")
        .setAttribute("aria-pressed", state.selectedMode === "teams");
      deps.$("team-assign").hidden = state.selectedMode !== "teams";
      deps.$("team-assign").innerHTML = deps.TEAMS.map(
        (t, team) =>
          `<div class="team-column" style="--team:${t.color}"><h3>${t.name} TEAM</h3>${state.seats.map((s, i) => (s && s.team === team ? `<button data-team-slot="${i}" style="--bird:${deps.birds[s.character].color}"><b>P${i + 1}</b> ${deps.birds[s.character].name} ${s.kind === "bot" ? "· BOT" : ""}<span>↔</span></button>` : "")).join("")}</div>`,
      ).join("");
      deps.$("fly").disabled = !canStart();
      deps.$("mode-message").textContent =
        state.selectedMode === "teams"
          ? "LEFT / RIGHT TO CHANGE YOUR TEAM · B BACK"
          : state.selectedMode
            ? "READY FOR TAKEOFF"
            : "LEFT / RIGHT TO CHOOSE · A SELECT · B BACK";
      const keyboardSeat = state.seats.find((s) => s?.kind === "keyboard");
      if (keyboardSeat) {
        const k = deps.keys[keyboardSeat.source];
        deps.$("mode-message").textContent =
          state.selectedMode === "teams"
            ? `${keyName(k.left)}/${keyName(k.right)} TEAM · ENTER TO FLY · ESC BACK`
            : state.selectedMode === "ffa"
              ? "ENTER TO FLY · ESC BACK"
              : `${keyName(k.left)}/${keyName(k.right)} CHOOSE · ${keyName(k.flap)} / ENTER SELECT · ESC BACK`;
        deps.$("mode-back").textContent = "ESC · BACK";
      } else deps.$("mode-back").textContent = "B · BACK";
      ["mode-ffa", "mode-teams", "fly"].forEach((id, i) =>
        deps
          .$(id)
          .setAttribute(
            "data-pad-focus",
            state.modeCursor === i ? "SELECT" : "",
          ),
      );
    }
    function renderSeats() {
      deps.$("seats").innerHTML = state.seats
        .map((s, i) =>
          s
            ? `<article class="rider-preview ${s.ready ? "is-ready" : ""}" style="--bird:${deps.birds[s.character].color}"><div>P${i + 1} ${s.kind === "bot" ? "· BOT" : ""}</div><canvas id="preview-${i}" width="240" height="112"></canvas><b>${deps.birds[s.character].name}</b><button data-action="ready" data-seat="${i}" ${s.kind === "bot" ? "disabled" : ""}>${s.ready ? "✓ READY" : `${s.kind === "keyboard" ? keyName(deps.keys[s.source].flap) : "A"} · READY`}</button></article>`
            : `<article class="rider-preview empty"><div>P${i + 1}</div><button data-action="join" data-seat="${i}" data-source="${i}">A / START<br>TO JOIN · KEY ${i + 1}</button></article>`,
        )
        .join("");
      deps.$("roster").innerHTML = deps.birds
        .map(
          (b, character) =>
            `<button class="roster-tile" data-character="${character}" style="--bird:${b.color}" aria-label="${b.name}, ${b.bird}"><div class="roster-markers">${state.seats.map((s, i) => (s?.character === character ? `<span class="${s.ready ? "locked" : ""}" style="--marker:${["#ff9064", "#77e8ba", "#b9a1ff", "#f8d66d"][i]}">${i + 1}${s.ready ? "✓" : ""}</span>` : "")).join("")}</div><canvas id="mount-${character}" width="320" height="168"></canvas><strong>${b.name}</strong><small>${b.bird}</small></button>`,
        )
        .join("");
      state.seats.forEach((s, i) => {
        if (s)
          deps.drawBird(
            deps.$("preview-" + i).getContext("2d"),
            120,
            70,
            s.character,
            1,
            false,
            true,
            2.8,
            state.clock,
          );
      });
      deps.birds.forEach((b, i) =>
        deps.drawPortrait(deps.$("mount-" + i).getContext("2d"), i),
      );
      deps.$("add-bot").disabled = state.seats.every(Boolean);
      deps.$("remove-bot").disabled = !state.seats.some(
        (s) => s?.kind === "bot",
      );
      deps.$("launch").disabled = !allReady();
      deps
        .$("launch")
        .setAttribute("data-pad-focus", allReady() ? "SELECT" : "");
      deps.$("lobby-message").textContent = allReady()
        ? "EVERYONE'S READY · A / START TO CONTINUE"
        : "A LOCK IN · B UNREADY · X ADD BOT · Y REMOVE BOT";
      const keyboardSeat = state.seats.find((s) => s?.kind === "keyboard");
      if (keyboardSeat) {
        const k = deps.keys[keyboardSeat.source];
        deps.$("lobby-message").textContent = allReady()
          ? "EVERYONE’S READY · ENTER TO CONTINUE · + / − BOTS"
          : `${keyName(k.left)}/${keyName(k.right)} PICK · ${keyName(k.flap)} READY · ${keyName(k.boost)} UNREADY · + / − BOTS`;
      }
      if (allReady()) deps.$("launch").focus();
    }
    async function fullscreen() {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        deps.announce("Use your browser fullscreen command");
      }
    }
    function initialize() {
      deps.$("seats").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const i = Number(b.dataset.seat);
        if (b.dataset.action === "join")
          join("keyboard", Number(b.dataset.source), i);
        if (b.dataset.action === "ready") {
          state.mouseSlot = i;
          ready(i);
        }
      });
      deps.$("roster").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        let slot =
          state.seats[state.mouseSlot]?.kind !== "bot" &&
          state.seats[state.mouseSlot] &&
          !state.seats[state.mouseSlot].ready
            ? state.mouseSlot
            : state.seats.findIndex((s) => s && s.kind !== "bot" && !s.ready);
        if (slot < 0) return;
        state.seats[slot].character = Number(b.dataset.character);
        randomBotCharacters();
        renderSeats();
      });
      deps.$("team-assign").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const i = Number(b.dataset.teamSlot);
        if (state.seats[i]?.kind === "bot") return;
        moveTeam(i, state.seats[i].team === 0 ? 1 : -1);
      });
      deps.$("mode-ffa").onclick = () => chooseMode("ffa");
      deps.$("mode-teams").onclick = () => chooseMode("teams");
      deps.$("fly").onclick = () => {
        if (canStart()) deps.startMatch();
      };
      deps.$("mode-back").onclick = backMode;
      deps.$("start").onclick = () => {
        deps.audioUnlock();
        show("lobby");
      };
      deps.$("back").onclick = () => show("menu");
      deps.$("add-bot").onclick = () => join("bot", Date.now());
      deps.$("remove-bot").onclick = removeBot;
      deps.$("launch").onclick = openMode;
      deps.$("pause-button").onclick = () => deps.pause();
      deps.$("resume").onclick = deps.resume;
      deps.$("quit").onclick = deps.$("change-players").onclick = () =>
        show("lobby");
      deps.$("rematch").onclick = deps.continueResults;
      deps.$("home-link").onclick = (e) => {
        e.preventDefault();
        if (state.screen === "lobby") show("menu");
      };
      deps.$("sound").onclick =
        deps.$("sound-play").onclick =
        deps.$("pause-sound").onclick =
          () => {
            deps.sound.toggle();
            deps.tone(550, 0.12, "triangle");
          };
      deps.$("fullscreen").onclick = deps.$("pause-fullscreen").onclick =
        fullscreen;
    }
    return {
      canStart,
      show,
      navigateMenu,
      selectMenu,
      allReady,
      removeBot,
      ready,
      join,
      rotate,
      openMode,
      backMode,
      backLobby,
      moveMode,
      selectMode,
      lobbySelect,
      renderSeats,
      initialize,
    };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
