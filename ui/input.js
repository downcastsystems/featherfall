/* input: presentation module. Dependencies: $, allReady, audioUnlock, backLobby, backMode, botInput, canStart, continueResults, edges, gamepadState, join, lobbySelect, moveMode, navigateMenu, openMode, pause, ready, removeBot, renderSeats, resume, rotate, selectMenu, selectMode, show, startMatch, startRound. */
(function (root) {
  "use strict";
  root.OneBigSkyUI ||= {};
  root.OneBigSkyUI.input = function createInput(state, deps) {
    const keys = [
      {
        left: "KeyA",
        right: "KeyD",
        flap: "KeyW",
        dive: "KeyS",
        boost: "KeyE",
        label: "A/D MOVE · W FLAP · S DIVE · E BOOST",
      },
      {
        left: "ArrowLeft",
        right: "ArrowRight",
        flap: "ArrowUp",
        dive: "ArrowDown",
        boost: "ShiftRight",
        label: "ARROWS MOVE/FLAP/DIVE · R.SHIFT BOOST",
      },
      {
        left: "KeyJ",
        right: "KeyL",
        flap: "KeyI",
        dive: "KeyK",
        boost: "KeyO",
        label: "J/L MOVE · I FLAP · K DIVE · O BOOST",
      },
      {
        left: "KeyF",
        right: "KeyH",
        flap: "KeyT",
        dive: "KeyG",
        boost: "KeyY",
        label: "F/H MOVE · T FLAP · G DIVE · Y BOOST",
      },
    ];
    function getPads() {
      try {
        return Array.from(navigator.getGamepads?.() || []).filter(
          (p) => p?.connected,
        );
      } catch {
        return [];
      }
    }
    function missingControllers(pads = getPads()) {
      return state.match
        ? state.match.players.filter(
            (p) => p.kind === "pad" && !pads.some((g) => g.index === p.source),
          )
        : [];
    }
    function pollPads() {
      const pads = getPads(),
        status = pads.length
          ? `${pads.length} CONTROLLER${pads.length > 1 ? "S" : ""} CONNECTED · START TO JOIN`
          : "LOCAL MULTIPLAYER";
      if (status !== state.lastPadStatus) {
        deps.$("controller-status").textContent = status;
        state.lastPadStatus = status;
      }
      for (const index of state.padPrevious.keys())
        if (!pads.some((p) => p.index === index)) {
          state.padPrevious.delete(index);
          state.padMove.delete(index);
        }
      state.padFrames.clear();
      for (const pad of pads) {
        const current = deps.gamepadState(pad),
          edge = deps.edges(current, state.padPrevious.get(pad.index));
        state.padPrevious.set(pad.index, current);
        state.padFrames.set(pad.index, current);
        const dir = Math.abs(current.move) > 0.5 ? Math.sign(current.move) : 0,
          moveEdge = dir && dir !== state.padMove.get(pad.index);
        state.padMove.set(pad.index, dir);
        if (edge.start || edge.flap) deps.audioUnlock();
        if (state.screen === "menu") {
          if (edge.up || edge.down) deps.navigateMenu(edge.up ? -1 : 1);
          if (edge.start || (edge.flap && state.menuIndex === 0)) {
            deps.show("lobby");
            deps.join("pad", pad.index);
          } else if (edge.flap) deps.selectMenu();
          continue;
        }
        if (state.screen === "lobby") {
          const slot = state.seats.findIndex(
            (s) => s?.kind === "pad" && s.source === pad.index,
          );
          if (edge.team) {
            deps.join("bot", Date.now());
            continue;
          }
          if (edge.mode || edge.removeBot) {
            deps.removeBot();
            continue;
          }
          if (slot < 0) {
            if (edge.start || edge.flap) deps.join("pad", pad.index);
            else if (edge.back) deps.show("menu");
            continue;
          }
          if (edge.back) {
            deps.backLobby(slot);
            continue;
          }
          if (moveEdge) deps.rotate(slot, dir);
          if (edge.up || edge.down) deps.rotate(slot, 4);
          if (edge.start) deps.openMode();
          else if (edge.flap) deps.lobbySelect(slot);
        } else if (state.screen === "mode-screen") {
          const slot = state.seats.findIndex(
            (s) => s?.kind === "pad" && s.source === pad.index,
          );
          if (slot < 0) continue;
          if (edge.back) {
            deps.backMode();
            continue;
          }
          if (moveEdge) deps.moveMode(slot, dir);
          if (edge.start && deps.canStart()) deps.startMatch();
          else if (edge.flap) deps.selectMode();
        } else if (["match", "countdown", "ending"].includes(state.screen)) {
          const participant = state.match.players.some(
            (p) => p.kind === "pad" && p.source === pad.index,
          );
          if (edge.start && participant) deps.pause();
          if (edge.flap && participant) state.pendingFlaps.add(pad.index);
          if (edge.boost && participant) state.pendingBoosts.add(pad.index);
        } else if (state.screen === "pause" || state.screen === "results") {
          if (edge.up || edge.down) deps.navigateMenu(edge.up ? -1 : 1);
          if (edge.flap) deps.selectMenu();
          else if (edge.start && state.screen === "pause") deps.resume();
          else if (edge.start && state.screen === "results")
            deps.continueResults();
          else if (edge.back) {
            if (state.screen === "pause") deps.resume();
            else deps.show("lobby");
          }
        }
      }
      if (
        ["match", "countdown", "ending"].includes(state.screen) &&
        missingControllers(pads).length
      )
        deps.pause(
          "A controller disconnected. Reconnect it to continue, or return to the lobby.",
          true,
        );
      if (state.screen === "lobby" || state.screen === "mode-screen") {
        let changed = false;
        state.seats.forEach((s, i) => {
          if (s?.kind === "pad" && !pads.some((p) => p.index === s.source)) {
            state.seats[i] = null;
            changed = true;
          }
        });
        if (changed) {
          if (state.screen === "mode-screen") deps.show("lobby");
          else deps.renderSeats();
        }
      }
      if (
        state.screen === "pause" &&
        state.pausedForDisconnect &&
        !missingControllers(pads).length
      )
        deps.$("pause-reason").textContent =
          "Controller reconnected. Press Start or Resume when everyone is ready.";
    }
    function inputFor(p, dt) {
      if (p.kind === "bot") return deps.botInput(p, state.match, dt);
      if (p.kind === "pad")
        return {
          move: state.padFrames.get(p.source)?.move || 0,
          flap: state.pendingFlaps.delete(p.source),
          flapHeld: !!state.padFrames.get(p.source)?.flap,
          dive: !!state.padFrames.get(p.source)?.dive,
          boost: state.pendingBoosts.delete(p.source),
        };
      const mapping = keys[p.source],
        flap = state.tapped.delete(mapping.flap);
      return {
        move:
          Number(state.pressed.has(mapping.right)) -
          Number(state.pressed.has(mapping.left)),
        flap,
        flapHeld: state.pressed.has(mapping.flap),
        dive: state.pressed.has(mapping.dive),
        boost: state.tapped.delete(mapping.boost),
      };
    }
    function initialize() {
      addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const gameKey =
          keys.some((k) =>
            [k.left, k.right, k.flap, k.dive, k.boost].includes(e.code),
          ) ||
          [
            "Enter",
            "Escape",
            "Digit1",
            "Digit2",
            "Digit3",
            "Digit4",
            "KeyP",
            "KeyN",
            "Equal",
            "Minus",
            "NumpadAdd",
            "NumpadSubtract",
          ].includes(e.code);
        if (gameKey) e.preventDefault();
        if (e.repeat) return;
        state.pressed.add(e.code);
        state.tapped.add(e.code);
        if (e.code === "KeyM") {
          deps.$("sound").click();
          return;
        }
        deps.audioUnlock();
        if (
          e.code === "KeyN" &&
          ["match", "countdown", "ending"].includes(state.screen)
        ) {
          state.pendingFlaps.clear();
          state.pendingBoosts.clear();
          state.tapped.clear();
          deps.startRound();
          return;
        }
        if (e.code === "KeyP" && state.screen === "match") {
          state.match.spawnPower(true);
          return;
        }
        if (
          (state.screen === "pause" ||
            state.screen === "results" ||
            state.screen === "menu") &&
          ["ArrowUp", "ArrowDown"].includes(e.code)
        ) {
          deps.navigateMenu(e.code === "ArrowUp" ? -1 : 1);
          return;
        }
        if (e.code === "Enter") {
          if (state.screen === "lobby") deps.openMode();
          else if (state.screen === "mode-screen") deps.selectMode();
          else deps.selectMenu();
        } else if (e.code === "Escape") {
          if (["match", "countdown", "ending"].includes(state.screen))
            deps.pause();
          else if (state.screen === "pause") deps.resume();
          else if (state.screen === "lobby") deps.show("menu");
          else if (state.screen === "mode-screen") deps.backMode();
          else if (state.screen === "results") deps.show("lobby");
        } else if (state.screen === "lobby") {
          if (["Equal", "NumpadAdd"].includes(e.code)) {
            deps.join("bot", null);
            return;
          }
          if (["Minus", "NumpadSubtract"].includes(e.code)) {
            deps.removeBot();
            return;
          }
          const source = keys.findIndex((k) =>
            [k.left, k.right, k.flap, k.dive].includes(e.code),
          );
          if (
            source >= 0 &&
            !state.seats.some(
              (s) => s?.kind === "keyboard" && s.source === source,
            )
          ) {
            deps.join(
              "keyboard",
              source,
              state.seats[source] ? state.seats.findIndex((s) => !s) : source,
            );
            return;
          }
          if (/^Digit[1-4]$/.test(e.code)) {
            const k = Number(e.code.slice(-1)) - 1;
            const slot = state.seats[k] ? state.seats.findIndex((s) => !s) : k;
            deps.join("keyboard", k, slot);
          }
          state.seats.forEach((s, i) => {
            if (s?.kind === "keyboard") {
              if (e.code === keys[s.source].left) deps.rotate(i, -1);
              if (e.code === keys[s.source].right) deps.rotate(i, 1);
              if (e.code === keys[s.source].dive) deps.rotate(i, 4);
              if (e.code === keys[s.source].flap) {
                if (deps.allReady()) deps.openMode();
                else if (!s.ready) deps.ready(i);
              }
              if (e.code === keys[s.source].boost) deps.backLobby(i);
            }
          });
        } else if (state.screen === "mode-screen") {
          const keyboardSeat = state.seats.findIndex(
            (s) =>
              s?.kind === "keyboard" &&
              [
                keys[s.source].left,
                keys[s.source].right,
                keys[s.source].flap,
                keys[s.source].boost,
              ].includes(e.code),
          );
          if (keyboardSeat >= 0) {
            const k = keys[state.seats[keyboardSeat].source];
            if (e.code === k.boost) deps.backMode();
            else if (e.code === k.left) deps.moveMode(keyboardSeat, -1);
            else if (e.code === k.right) deps.moveMode(keyboardSeat, 1);
            else if (e.code === k.flap) deps.selectMode();
          } else if (
            ["ArrowLeft", "ArrowRight"].includes(e.code) &&
            state.selectedMode === null
          ) {
            deps.moveMode(-1, e.code === "ArrowLeft" ? -1 : 1);
          }
        }
      });
      addEventListener("keyup", (e) => state.pressed.delete(e.code));
      addEventListener("blur", () => {
        state.pressed.clear();
        state.tapped.clear();
        state.pendingFlaps.clear();
        state.pendingBoosts.clear();
        deps.pause("Paused because the game lost focus.");
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          state.pressed.clear();
          state.tapped.clear();
          deps.pause("Paused while the game was in the background.");
        }
      });
    }
    return { keys, missingControllers, pollPads, inputFor, initialize };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
