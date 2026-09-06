/* Featherfall presentation and local input. */
(() => {
  "use strict";
  const {
    W,
    H,
    CHARACTERS: birds,
    TEAMS,
    ARENAS,
    ArenaRotation,
    PLATFORM_DEPTH,
    Match,
    botInput,
    gamepadState,
    edges,
  } = Featherfall;
  const arenaRotation = new ArenaRotation();
  const $ = (id) => document.getElementById(id);
  const canvas = $("arena"),
    ctx = canvas.getContext("2d");
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
  let screen = "menu",
    seats = [null, null, null, null],
    mode = "ffa",
    match = null;
  const { MatchSeries, rankPlayers } = FeatherfallSeries;
  const broadcast = new FeatherfallBroadcast.Broadcast();
  let series = null,
    resultsMode = "round";
  const powerColor = {
    flame: "#ff9658",
    sawblade: "#d8e7ff",
    rocket: "#73eaff",
  };
  let countdown = 0,
    endingTime = 0,
    clock = 0,
    last = 0,
    accumulator = 0,
    hudClock = 0;
  let pressed = new Set(),
    tapped = new Set(),
    padPrevious = new Map(),
    padMove = new Map(),
    padFrames = new Map(),
    pendingFlaps = new Set(),
    pendingBoosts = new Set();
  let menuIndex = 0;
  let particles = [],
    lastPadStatus = "",
    pausedForDisconnect = false;
  const STEP = 1 / 120;
  function resize() {
    const scale = Math.min(innerWidth / W, innerHeight / H);
    $("stage").style.transform = `scale(${scale})`;
    $("stage").style.left = `${(innerWidth - W * scale) / 2}px`;
    $("stage").style.top = `${(innerHeight - H * scale) / 2}px`;
  }
  addEventListener("resize", resize);
  resize();
  function updateSoundControl() {
    for (const id of ["sound", "sound-play", "pause-sound"]) {
      $(id).textContent = sound.blocked
        ? "CLICK FOR SOUND"
        : sound.enabled
          ? "SOUND ON"
          : "SOUND OFF";
      $(id).setAttribute(
        "aria-label",
        sound.blocked
          ? "Enable browser audio"
          : sound.enabled
            ? "Mute sound"
            : "Enable sound",
      );
    }
  }
  const sound = new ArcadeAudio(
    window.AudioContext || window.webkitAudioContext,
    updateSoundControl,
  );
  function audioUnlock() {
    sound.unlock();
  }
  function tone(...args) {
    sound.tone(...args);
  }
  updateSoundControl();
  // Gamepad polling is not a browser activation gesture. A click or keypress
  // anywhere in the game also unlocks audio if the browser requires one.
  addEventListener("pointerdown", (event) => {
    if (!event.target.closest?.("#sound, #sound-play, #pause-sound"))
      audioUnlock();
  });
  function show(next) {
    if (next === "menu") seats = [null, null, null, null];
    screen = next;
    menuIndex = 0;
    for (const id of ["menu", "lobby", "pause", "results"])
      $(id).hidden = next !== id;
    const inArena = [
      "match",
      "countdown",
      "ending",
      "pause",
      "results",
    ].includes(next);
    $("hud").hidden = !inArena;
    document.body.classList.toggle("playing", inArena);
    $("announcement").textContent = "";
    $("announcement").className = "";
    pressed.clear();
    tapped.clear();
    pendingFlaps.clear();
    pendingBoosts.clear();
    accumulator = 0;
    if (next === "lobby") {
      renderSeats();
      $("launch").focus();
    }
    if (next === "menu") $("start").focus();
    if (next === "pause") $("resume").focus();
    if (next === "results") $("rematch").focus();
    refreshMenuFocus();
  }
  function announce(text) {
    broadcast.say(text);
  }
  const playerName = (p) => `${birds[p.character].name} (P${p.slot + 1})`;
  function menuOptions() {
    if (screen === "menu") return ["start", "sound", "fullscreen"];
    if (screen === "pause")
      return ["resume", "pause-sound", "pause-fullscreen", "quit"];
    if (screen === "results") return ["rematch", "change-players"];
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
      $(id).setAttribute("data-pad-focus", "");
    const options = menuOptions();
    if (options.length)
      $(options[menuIndex % options.length]).setAttribute(
        "data-pad-focus",
        "SELECT",
      );
  }
  function navigateMenu(direction) {
    const options = menuOptions();
    if (!options.length) return;
    menuIndex = (menuIndex + direction + options.length) % options.length;
    refreshMenuFocus();
    $(options[menuIndex]).focus();
  }
  function selectMenu() {
    const id = menuOptions()[menuIndex];
    if (id) $(id).click();
  }
  function lobbyRows() {
    return [
      "character",
      ...(mode === "teams" ? ["team"] : []),
      "ready",
      "mode",
      "add-bot",
      "remove-bot",
      "launch",
      "sound",
      "fullscreen",
      "back",
    ];
  }
  function removeBot() {
    const slot = seats.findLastIndex((s) => s?.kind === "bot");
    if (slot < 0) return;
    seats[slot] = null;
    renderSeats();
  }
  function ready(slot) {
    seats[slot].ready = !seats[slot].ready;
    renderSeats();
    if (canStart() && seats.filter(Boolean).every((s) => s.ready)) startMatch();
  }
  function lobbySelect(slot) {
    const s = seats[slot],
      row = s.cursor || "character";
    if (row === "character") {
      if (!s.ready) ready(slot);
    } else if (row === "team") {
      s.team ^= 1;
      s.ready = false;
      renderSeats();
    } else if (row === "ready") ready(slot);
    else if (row === "back") {
      seats[slot] = null;
      show("menu");
    } else $(row).click();
  }
  function join(kind, source, slot = seats.findIndex((s) => !s)) {
    if (
      slot < 0 ||
      seats[slot] ||
      seats.some(
        (s) => s && s.kind === kind && s.source === source && kind !== "bot",
      )
    )
      return;
    seats[slot] = {
      kind,
      source,
      character: slot % birds.length,
      cursor: "character",
      team: slot % 2,
      ready: kind === "bot",
    };
    tone(460, 0.1, "triangle", 0.05, 700);
    renderSeats();
  }
  function rotate(slot, direction) {
    if (!seats[slot]) return;
    seats[slot].character =
      (seats[slot].character + direction + birds.length) % birds.length;
    if (seats[slot].kind !== "bot") seats[slot].ready = false;
    renderSeats();
  }
  function changeMode() {
    mode = mode === "ffa" ? "teams" : "ffa";
    seats.forEach((s) => {
      if (s?.cursor === "team" && mode !== "teams") s.cursor = "character";
    });
    renderSeats();
  }
  function canStart() {
    const active = seats.filter(Boolean);
    return (
      active.length >= 2 &&
      (mode !== "teams" || new Set(active.map((s) => s.team)).size === 2)
    );
  }
  function renderSeats() {
    $("mode").innerHTML =
      `${mode === "ffa" ? "FREE FOR ALL" : "TWO TEAMS"} <span>&lt;&gt;</span>`;
    $("seats").innerHTML = seats
      .map((s, i) => {
        if (!s) {
          const free = keys
            .map((_, k) => k)
            .filter(
              (k) =>
                !seats.some((s) => s?.kind === "keyboard" && s.source === k),
            );
          const source = free.includes(i) ? i : free[0];
          return `<article class="seat empty"><div class="seat-label">PLAYER 0${i + 1}</div><div class="plus">+</div><h3>ROOM FOR ONE MORE</h3><button data-action="join" data-seat="${i}" data-source="${source}">PRESS ${source + 1} TO JOIN</button><p>OR PRESS START ON A CONTROLLER</p></article>`;
        }
        const b = birds[s.character],
          source =
            s.kind === "bot"
              ? "PRACTICE BOT"
              : s.kind === "pad"
                ? `CONTROLLER ${s.source + 1}`
                : `KEYBOARD ${s.source + 1}`;
        const team = TEAMS[s.team],
          cursor = s.kind === "pad" ? s.cursor : "";
        const selected = (row) =>
          cursor === row ? ' data-selected="true"' : "";
        return `<article class="seat joined ${s.ready ? "is-ready" : ""} ${mode === "teams" ? "team-seat" : ""}" style="--bird:${b.color};--team:${team.color};--team-dark:${team.dark}">${mode === "teams" ? `<div class="team-banner">${team.name} TEAM</div>` : ""}<div class="seat-label"><b>PLAYER 0${i + 1}</b><span>${source}</span></div><canvas id="preview-${i}" width="168" height="100" aria-label="${b.name} (P${i + 1}) ${b.bird}"></canvas><div class="character-picker"${selected("character")}><button data-action="prev" data-seat="${i}" aria-label="Previous character for player ${i + 1}">&lt;</button><div><h3>${b.name} <small>(P${i + 1})</small></h3><span class="bird-type">${b.bird}</span></div><button data-action="next" data-seat="${i}" aria-label="Next character for player ${i + 1}">&gt;</button></div><div class="seat-controls">${s.kind === "keyboard" ? keys[s.source].label : s.kind === "pad" ? "A TAP/HOLD FLAP · DOWN DIVE · X BOOST" : "AUTOPILOT · SAME RULES AS YOU"}</div><div class="seat-actions">${mode === "teams" ? `<button class="team-button"${selected("team")} data-action="team" data-seat="${i}">${s.team === 0 ? "SUN TEAM" : "MOON TEAM"} &lt;&gt;</button>` : ""}${s.kind === "bot" ? '<span class="bot-ready">✓ READY</span>' : `<button aria-pressed="${s.ready}"${selected("ready")} data-action="ready" data-seat="${i}">${s.ready ? "✓ READY" : "READY"}</button>`}<button class="remove" data-action="remove" data-seat="${i}">${s.kind === "bot" ? "REMOVE BOT" : "LEAVE x"}</button></div><div class="ready">${s.kind === "bot" ? "AUTOPILOT READY" : s.ready ? "✓ READY TO FLY · B UNREADY" : "FLAP / A TO READY"}</div></article>`;
      })
      .join("");
    seats.forEach((s, i) => {
      if (s) {
        const c = $(`preview-${i}`).getContext("2d");
        drawBird(c, 84, 55, s.character, 1, false, true, 3.4, clock);
      }
    });
    for (const id of [
      "mode",
      "add-bot",
      "remove-bot",
      "launch",
      "sound",
      "fullscreen",
      "back",
    ]) {
      const cursors = seats
        .map((s, i) =>
          s?.kind === "pad" && s.cursor === id ? `P${i + 1}` : "",
        )
        .filter(Boolean);
      $(id).setAttribute("data-pad-focus", cursors.join("/"));
    }
    $("add-bot").disabled = seats.every(Boolean);
    $("remove-bot").disabled = !seats.some((s) => s?.kind === "bot");
    $("launch").disabled = !canStart();
    const count = seats.filter(Boolean).length;
    $("lobby-message").textContent =
      count < 2
        ? "Join a second player or add a practice bot."
        : !canStart()
          ? "Put at least one rider on each team."
          : "FLAP / A TO READY · B UNREADY · ENTER TO LAUNCH";
  }
  $("seats").addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    audioUnlock();
    const i = Number(button.dataset.seat),
      action = button.dataset.action;
    if (action === "join") join("keyboard", Number(button.dataset.source), i);
    if (action === "prev" || action === "next")
      rotate(i, action === "next" ? 1 : -1);
    if (action === "remove") {
      seats[i] = null;
      renderSeats();
    }
    if (action === "ready" && seats[i]) ready(i);
    if (action === "team" && seats[i]) {
      seats[i].team ^= 1;
      if (seats[i].kind !== "bot") seats[i].ready = false;
      renderSeats();
    }
  });
  function startMatch() {
    if (!canStart()) return;
    series = new MatchSeries(
      seats.filter(Boolean).map((s) => ({ ...s, slot: seats.indexOf(s) })),
      mode,
    );
    startRound();
  }
  function startRound() {
    audioUnlock();
    match = new Match(
      series.seats,
      series.mode,
      Math.random,
      arenaRotation.next(),
    );
    buildBackground(match.arena);
    mode = series.mode;
    particles = [];
    broadcast.reset();
    $("commentary").textContent = "";
    countdown = 3;
    endingTime = 0;
    resultsMode = "round";
    show("countdown");
    updateHud();
    tone(300, 0.15);
  }
  function continueResults() {
    if (resultsMode === "match") startMatch();
    else if (series.winner) showResults(true);
    else startRound();
  }
  function pause(reason = "The sky can wait.", disconnect = false) {
    if (!["match", "countdown", "ending"].includes(screen)) return;
    pausedForDisconnect = disconnect;
    $("pause-reason").textContent = reason;
    show("pause");
  }
  function resume() {
    if (screen !== "pause") return;
    if (missingControllers().length) {
      $("pause-reason").textContent =
        "Reconnect the missing controller, then press Start or Resume. You can also return to the lobby.";
      return;
    }
    pausedForDisconnect = false;
    audioUnlock();
    show(endingTime > 0 ? "ending" : countdown > 0 ? "countdown" : "match");
  }
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
    return match
      ? match.players.filter(
          (p) => p.kind === "pad" && !pads.some((g) => g.index === p.source),
        )
      : [];
  }
  $("start").onclick = () => {
    audioUnlock();
    show("lobby");
  };
  $("back").onclick = () => show("menu");
  $("mode").onclick = changeMode;
  $("add-bot").onclick = () => join("bot", Date.now());
  $("remove-bot").onclick = removeBot;
  $("launch").onclick = startMatch;
  $("pause-button").onclick = () => pause();
  $("resume").onclick = resume;
  $("quit").onclick = $("change-players").onclick = () => show("lobby");
  $("rematch").onclick = continueResults;
  $("home-link").onclick = (e) => {
    e.preventDefault();
    if (screen === "lobby") show("menu");
  };
  $("sound").onclick =
    $("sound-play").onclick =
    $("pause-sound").onclick =
      () => {
        sound.toggle();
        tone(550, 0.12, "triangle");
      };
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      announce("Use your browser fullscreen command");
    }
  }
  $("fullscreen").onclick = $("pause-fullscreen").onclick = fullscreen;
  // Native key repeat is ignored; held flaps repeat at the simulation cadence.
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
      ].includes(e.code);
    if (gameKey) e.preventDefault();
    if (e.repeat) return;
    pressed.add(e.code);
    tapped.add(e.code);
    if (e.code === "KeyM") {
      $("sound").click();
      return;
    }
    audioUnlock();
    if (
      e.code === "KeyN" &&
      ["match", "countdown", "ending"].includes(screen)
    ) {
      pendingFlaps.clear();
      pendingBoosts.clear();
      tapped.clear();
      startRound();
      return;
    }
    if (e.code === "KeyP" && screen === "match") {
      match.spawnPower(true);
      return;
    }
    if (
      (screen === "pause" || screen === "results" || screen === "menu") &&
      ["ArrowUp", "ArrowDown"].includes(e.code)
    ) {
      navigateMenu(e.code === "ArrowUp" ? -1 : 1);
      return;
    }
    if (e.code === "Enter") {
      if (screen === "lobby") startMatch();
      else selectMenu();
    } else if (e.code === "Escape") {
      if (["match", "countdown", "ending"].includes(screen)) pause();
      else if (screen === "pause") resume();
      else if (screen === "lobby") show("menu");
      else if (screen === "results") show("lobby");
    } else if (screen === "lobby") {
      if (/^Digit[1-4]$/.test(e.code)) {
        const k = Number(e.code.slice(-1)) - 1;
        const slot = seats[k] ? seats.findIndex((s) => !s) : k;
        join("keyboard", k, slot);
      }
      seats.forEach((s, i) => {
        if (s?.kind === "keyboard") {
          if (e.code === keys[s.source].left) rotate(i, -1);
          if (e.code === keys[s.source].right) rotate(i, 1);
          if (e.code === keys[s.source].flap && !s.ready) ready(i);
          if (e.code === "KeyB") {
            s.ready = false;
            renderSeats();
          }
        }
      });
    }
  });
  addEventListener("keyup", (e) => pressed.delete(e.code));
  addEventListener("blur", () => {
    pressed.clear();
    tapped.clear();
    pendingFlaps.clear();
    pendingBoosts.clear();
    pause("Paused because the game lost focus.");
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pressed.clear();
      tapped.clear();
      pause("Paused while the game was in the background.");
    }
  });
  function pollPads() {
    const pads = getPads(),
      status = pads.length
        ? `${pads.length} CONTROLLER${pads.length > 1 ? "S" : ""} CONNECTED · START TO JOIN`
        : "LOCAL MULTIPLAYER";
    if (status !== lastPadStatus) {
      $("controller-status").textContent = status;
      lastPadStatus = status;
    }
    for (const index of padPrevious.keys())
      if (!pads.some((p) => p.index === index)) {
        padPrevious.delete(index);
        padMove.delete(index);
      }
    padFrames.clear();
    for (const pad of pads) {
      const current = gamepadState(pad),
        edge = edges(current, padPrevious.get(pad.index));
      padPrevious.set(pad.index, current);
      padFrames.set(pad.index, current);
      const dir = Math.abs(current.move) > 0.5 ? Math.sign(current.move) : 0,
        moveEdge = dir && dir !== padMove.get(pad.index);
      padMove.set(pad.index, dir);
      if (edge.start || edge.flap) audioUnlock();
      if (screen === "menu") {
        if (edge.up || edge.down) navigateMenu(edge.up ? -1 : 1);
        if (edge.start || (edge.flap && menuIndex === 0)) {
          show("lobby");
          join("pad", pad.index);
        } else if (edge.flap) selectMenu();
        continue;
      }
      if (screen === "lobby") {
        if (edge.removeBot) {
          removeBot();
          continue;
        }
        const slot = seats.findIndex(
          (s) => s?.kind === "pad" && s.source === pad.index,
        );
        if (slot < 0) {
          if (edge.start || edge.flap) join("pad", pad.index);
          else if (edge.back) show("menu");
          continue;
        }
        if (edge.back) {
          if (seats[slot].ready) {
            seats[slot].ready = false;
            seats[slot].cursor = "character";
          } else seats[slot] = null;
          renderSeats();
          continue;
        }
        if (edge.up || edge.down) {
          const rows = lobbyRows(),
            index = Math.max(0, rows.indexOf(seats[slot].cursor));
          seats[slot].cursor =
            rows[(index + (edge.up ? -1 : 1) + rows.length) % rows.length];
          renderSeats();
        }
        if (moveEdge) {
          if (seats[slot].cursor === "team" && mode === "teams") {
            seats[slot].team ^= 1;
            seats[slot].ready = false;
            renderSeats();
          } else if (seats[slot].cursor === "mode") changeMode();
          else if (seats[slot].cursor === "character") rotate(slot, dir);
        }
        if (edge.team && mode === "teams") {
          seats[slot].team ^= 1;
          seats[slot].ready = false;
          renderSeats();
        }
        if (edge.mode) changeMode();
        if (edge.start) ready(slot);
        else if (edge.flap) lobbySelect(slot);
      } else if (["match", "countdown", "ending"].includes(screen)) {
        const participant = match.players.some(
          (p) => p.kind === "pad" && p.source === pad.index,
        );
        if (edge.start && participant) pause();
        if (edge.flap && participant) pendingFlaps.add(pad.index);
        if (edge.boost && participant) pendingBoosts.add(pad.index);
      } else if (screen === "pause" || screen === "results") {
        if (edge.up || edge.down) navigateMenu(edge.up ? -1 : 1);
        if (edge.flap) selectMenu();
        else if (edge.start && screen === "pause") resume();
        else if (edge.start && screen === "results") continueResults();
        else if (edge.back) {
          if (screen === "pause") resume();
          else show("lobby");
        }
      }
    }
    if (
      ["match", "countdown", "ending"].includes(screen) &&
      missingControllers(pads).length
    )
      pause(
        "A controller disconnected. Reconnect it to continue, or return to the lobby.",
        true,
      );
    if (screen === "lobby") {
      let changed = false;
      seats.forEach((s, i) => {
        if (s?.kind === "pad" && !pads.some((p) => p.index === s.source)) {
          seats[i] = null;
          changed = true;
        }
      });
      if (changed) renderSeats();
    }
    if (
      screen === "pause" &&
      pausedForDisconnect &&
      !missingControllers(pads).length
    )
      $("pause-reason").textContent =
        "Controller reconnected. Press Start or Resume when everyone is ready.";
  }
  function inputFor(p, dt) {
    if (p.kind === "bot") return botInput(p, match, dt);
    if (p.kind === "pad")
      return {
        move: padFrames.get(p.source)?.move || 0,
        flap: pendingFlaps.delete(p.source),
        flapHeld: !!padFrames.get(p.source)?.flap,
        dive: !!padFrames.get(p.source)?.dive,
        boost: pendingBoosts.delete(p.source),
      };
    const mapping = keys[p.source],
      flap = tapped.delete(mapping.flap);
    return {
      move:
        Number(pressed.has(mapping.right)) - Number(pressed.has(mapping.left)),
      flap,
      flapHeld: pressed.has(mapping.flap),
      dive: pressed.has(mapping.dive),
      boost: tapped.delete(mapping.boost),
    };
  }
  function burst(x, y, color, count, force = 1) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2,
        speed = (35 + Math.random() * 190) * force;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 40,
        life: 0.6 + Math.random() * 0.7,
        total: 1.3,
        color,
        size: 2 + Math.random() * 4,
        angle: a,
      });
    }
  }
  function drawFireball(x, y) {
    ctx.fillStyle = "#ff6b3260";
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff843d";
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff4b0";
    ctx.fillRect(x - 4, y - 5, 8, 9);
  }
  function drawSaw(x, y, angle, radius = 28) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    for (let i = 0; i < 48; i++) {
      const a = (i * Math.PI) / 24,
        r = i % 4 < 2 ? radius : radius * 0.7;
      if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = "#d8e7ff";
    ctx.fill();
    ctx.strokeStyle = "#6b839f";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#31475e";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawRocketPickup(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    ctx.fillStyle = "#ff9658";
    ctx.fillRect(-27, -3, 12, 6);
    ctx.fillStyle = "#ffe8ac";
    ctx.fillRect(-23, -2, 9, 4);
    ctx.fillStyle = "#54758c";
    ctx.fillRect(-15, -6, 5, 12);
    ctx.fillStyle = "#d9f6ff";
    ctx.fillRect(-10, -7, 22, 14);
    ctx.fillStyle = "#73eaff";
    ctx.fillRect(-8, 4, 20, 3);
    ctx.fillStyle = "#ff9064";
    ctx.fillRect(12, -5, 5, 10);
    ctx.fillRect(17, -3, 4, 6);
    ctx.fillRect(21, -1, 3, 2);
    ctx.fillRect(-12, -13, 6, 6);
    ctx.fillRect(-6, -10, 6, 3);
    ctx.fillRect(-12, 7, 6, 6);
    ctx.fillRect(-6, 7, 6, 3);
    ctx.fillStyle = "#315d79";
    ctx.fillRect(1, -4, 7, 7);
    ctx.fillStyle = "#a7efff";
    ctx.fillRect(2, -3, 3, 3);
    ctx.restore();
  }
  function drawRocketExhaust(p, x) {
    ctx.save();
    ctx.translate(x, p.y);
    // The plume follows the mount's tail, including its nose-down dive pose.
    if (p.diving && !p.grounded) ctx.rotate(Math.PI / 2);
    else ctx.scale(p.facing, 1);
    const tail = p.diving && !p.grounded ? 20 : 23;
    const length =
      (p.boosting ? 42 : 26) + Math.floor(Math.sin(match.time * 36) * 5);
    ctx.fillStyle = "#ed633d";
    ctx.fillRect(-tail - length, -2, length, 4);
    ctx.fillRect(-tail - length + 5, -4, length - 5, 8);
    ctx.fillRect(-tail - length + 12, -6, length - 12, 12);
    ctx.fillStyle = "#ffb94e";
    ctx.fillRect(-tail - length + 9, -4, length - 7, 8);
    ctx.fillStyle = "#fff0b0";
    ctx.fillRect(-tail - 11, -2, 13, 4);
    ctx.restore();
  }
  const koLabel = (count) => `${count} ${count === 1 ? "KO" : "KOs"}`;
  function processEvents() {
    for (const event of match.events) {
      const color =
        event.id !== undefined
          ? birds[match.players[event.id].character].color
          : "#ffe9b4";
      if (event.type === "eruption-warning") {
        broadcast.say(
          "The volcano has entered the match. Lovely. More hotheads.",
          {},
          1,
        );
      }
      if (event.type === "volcano-impact") {
        burst(event.x, event.y, "#ff9b45", 18, 0.7);
        burst(event.x, event.y, "#ffe8a0", 6, 0.4);
        sound.play("zombie-pop", 1);
      }
      if (event.type === "zombie-pop") {
        burst(event.x, event.y, "#e84b4b", 15, 0.7);
        burst(event.x, event.y, "#992e3c", 7, 0.5);
        sound.play("zombie-pop", event.variant);
      }
      if (event.type === "death") {
        burst(event.x, event.y, color, 35, 1.5);
        burst(event.x, event.y, "#eee7d3", 10);
        sound.play("death");
        const victim = match.players[event.id];
        const attacker = match.players[event.attackerId];
        if (attacker)
          broadcast.say(
            event.eliminated ? "out" : "ko",
            {
              a: playerName(attacker),
              v: playerName(victim),
            },
            event.eliminated ? 2 : 1,
          );
        else
          broadcast.say(
            event.cause === "zombie"
              ? `${playerName(victim)} ${event.eliminated ? "is out. Outplayed by the dearly departed." : "loses a life to a zombie. Brains were clearly on the menu."}`
              : event.cause === "volcano"
                ? `${playerName(victim)} caught a fireball. With their face.`
                : `${playerName(victim)} ${event.eliminated ? "is out of the round!" : "loses a life. Tough landing!"}`,
            {},
            1,
          );
      }
      if (event.type === "spawn") {
        burst(event.x, event.y, "#fff1c8", 16, 0.4);
        sound.play("spawn");
      }
      if (event.type === "flap") {
        burst(event.x, event.y + 8, color, 2, 0.15);
        sound.play("flap", match.players[event.id].character);
      }
      if (event.type === "boost") {
        burst(event.x, event.y, color, 12, 0.5);
        tone(170, 0.18, "triangle", 0.06, 650);
      }
      if (event.type === "dive") tone(280, 0.14, "triangle", 0.04, 65);
      if (event.type === "step") sound.play("step", event.foot);
      if (event.type === "bump") {
        burst(event.x, event.y, "#b6c2b2", 5, 0.3);
        tone(110, 0.06, "triangle", 0.025, 65);
      }
      if (event.type === "clash") {
        burst(event.x, event.y, "#fff0c0", 9);
        tone(380, 0.08);
      }
      if (event.type === "life") {
        burst(event.x, event.y, "#ffe6a0", 24);
        broadcast.say(event.maxReached ? "capped" : "life", {
          a: playerName(match.players[event.id]),
        });
        tone(660, 0.35, "triangle", 0.07, 1320);
      }
      if (event.type === "power") {
        burst(event.x, event.y, powerColor[event.kind], 28);
        broadcast.say(event.kind, { a: playerName(match.players[event.id]) });
        tone(420, 0.35, "triangle", 0.06, 1300);
      }
      if (event.type === "power-appeared") {
        tone(600, 0.25, "triangle", 0.04, 1000);
      }
      if (event.type === "pickup") {
        tone(700, 0.3, "sine", 0.04, 1050);
      }
    }
    match.events.length = 0;
  }
  function updateHud() {
    if (!match) return;
    $("players-hud").innerHTML = match.players
      .map((p) => {
        const b = birds[p.character];
        const total = series.players[p.id];
        const kills = total.kills + (series.recorded.has(match) ? 0 : p.kills);
        return `<div class="hud-player ${p.lives === 0 ? "out" : ""} ${mode === "teams" ? "team-hud" : ""}" style="--bird:${b.color};--team:${TEAMS[p.team].color}">
          <div class="hud-heading"><div class="name">${playerName(p)}${mode === "teams" ? ` · ${p.team === 0 ? "SUN" : "MOON"}` : ""}</div><div class="hud-stats"><span class="ko-count">${koLabel(kills)}</span><span class="win-count">${total.wins} ${total.wins === 1 ? "WIN" : "WINS"}</span></div></div>
          <div class="hud-vitals"><div class="lives" aria-label="${p.lives} lives">${p.lives ? Array.from({ length: p.lives }, () => '<i class="pixel-heart" aria-hidden="true"></i>').join("") : "✕ OUT"}</div><div class="hud-flight">${!p.alive ? (p.lives ? `<span class="meta">RETURNING IN ${Math.ceil(p.respawn)}...</span>` : "") : `${p.power ? `<span class="power-timer" aria-label="Power-up time remaining" style="color:${powerColor[p.power]}">${Math.ceil(p.powerTime)}s</span>` : ""}<div class="boost-meter ${p.boostCharge >= 1 ? "charged" : ""}" role="progressbar" aria-label="${playerName(p)} boost" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.boostCharge * 100)}"><i style="width:${p.boostCharge * 100}%"></i><span>${p.zombieSpeedStacks ? `+${p.zombieSpeedStacks * 10}% · ${Math.ceil(p.zombieSpeedTime)}s` : p.power === "rocket" ? "UNLIMITED BOOST" : p.boostCharge >= 1 ? "BOOST READY" : "BOOST"}</span></div>`}</div></div>
        </div>`;
      })
      .join("");
    const time = Math.floor(match.time);
    $("match-time").textContent =
      `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
    $("match-mode").textContent =
      `ROUND ${series.rounds.length + (series.recorded.has(match) ? 0 : 1)} · FIRST TO 3`;
  }
  function finish() {
    endingTime = 0;
    series.recordRound(match);
    showResults(false);
  }
  function showResults(final) {
    resultsMode = final ? "match" : "round";
    updateHud();
    show("results");
    tone(440, 0.6, "triangle", 0.06, 880);
    const result = final ? series.winner : match.winner,
      winner = match.players.find((p) => p.id === result.id),
      teamName = result.team === 0 ? "Sun team" : "Moon team";
    $("results-heading").textContent = final
      ? "MATCH TOTALS"
      : `ROUND ${series.rounds.length} RESULTS`;
    $("winner-title").textContent = result.draw
      ? "A sky without a winner."
      : mode === "teams"
        ? `${teamName} wins!`
        : `${playerName(winner)} wins!`;
    $("winner-subtitle").textContent = final
      ? `First to three. ${series.rounds.length} rounds of flying mayhem.`
      : result.draw
        ? "No win awarded. The next round starts fresh."
        : series.winner
          ? "Three wins! Match totals and awards are up next."
          : "Round complete. First to three wins takes the match.";
    $("rematch").textContent = final
      ? "PLAY AGAIN >"
      : series.winner
        ? "MATCH TOTALS >"
        : "NEXT ROUND >";
    $("scoreboard").className = final ? "match-totals" : "round-totals";
    const rows = final ? rankPlayers(series.players) : match.players;
    $("scoreboard").innerHTML = [...rows]
      .sort((a, b) =>
        final
          ? b.wins - a.wins || b.kills - a.kills
          : b.lives - a.lives || b.kills - a.kills,
      )
      .map((p) => {
        const total = series.players[p.id],
          award = final ? series.awards[p.id] : null;
        return `<div class="score-row"><div class="score-line"><span style="color:${birds[p.character].color}">${final ? `<b class="final-rank" aria-label="Rank ${p.rank}">#${p.rank}</b> ` : ""}${playerName(p)}${mode === "teams" ? ` · ${TEAMS[p.team].name}` : ""}</span><span>${koLabel(p.kills)} · ${total.wins} ${total.wins === 1 ? "WIN" : "WINS"}${final ? "" : ` · ${p.lives} ${p.lives === 1 ? "LIFE" : "LIVES"} LEFT`}</span></div>${award ? `<div class="award"><strong>${award.label}</strong><small>${award.reason}</small></div>` : ""}</div>`;
      })
      .join("");
    const c = $("winner-bird").getContext("2d");
    c.clearRect(0, 0, 180, 100);
    const winners = result.draw
      ? []
      : mode === "teams"
        ? match.players.filter((p) => p.team === result.team)
        : [winner];
    winners.forEach((p, i) =>
      drawBird(
        c,
        (180 / winners.length) * (i + 0.5),
        55,
        p.character,
        1,
        true,
        false,
        Math.min(3, 3.4 / winners.length),
        clock,
      ),
    );
  }
  // Original pixel mounts. The dive pose is artwork only; physics stays shared.
  function drawZombie(c, z, time) {
    c.save();
    c.translate(Math.round(z.x), Math.round(z.y));
    // Rising from the soil, then shuffling or panicking with hands overhead.
    if (z.emerge > 0) {
      c.beginPath();
      c.rect(-18, -26, 36, 26);
      c.clip();
      c.translate(0, Math.ceil((z.emerge / 0.9) * 18));
    }
    c.scale(z.vx < 0 ? -1 : 1, 1);
    const r = (x, y, w, h, color) => {
      c.fillStyle = color;
      c.fillRect(x, y, w, h);
    };
    const falling = !z.grounded && z.emerge <= 0;
    const phase = Math.floor(time * (falling ? 10 : 8) + z.id) % 4;
    const leg = z.grounded ? (phase % 2 ? 2 : -2) : 1;
    r(-4, -10, 8, 7, "#343041");
    r(-3, -10, 7, 5, "#81718e");
    r(-4, -17, 8, 8, "#4f6950");
    r(-3, -17, 7, 6, "#b5cb8b");
    r(-4, -18, 6, 2, "#687553");
    r(2, -15, 2, 2, "#20232e");
    r(1, -11, 4, 1, "#586143");
    if (falling) {
      // Wide eye and a little screaming mouth; the head never flips or rotates.
      r(1, -16, 3, 3, "#e6edc7");
      r(3, -15, 1, 2, "#20232e");
      r(1, -12, 3, 3, "#20232e");
      r(2, -10, 2, 1, "#bc777c");
      // Uneven raised elbows and reaching hands, rather than a rotary arm cycle.
      const [leftX, leftY, rightX, rightY] = [
        [-7, -23, 7, -18],
        [-10, -19, 6, -24],
        [-8, -24, 9, -21],
        [-6, -20, 8, -23],
      ][phase];
      r(leftX, -11, -leftX - 3, 2, "#b5cb8b");
      r(leftX, leftY, 2, -leftY - 9, "#b5cb8b");
      r(leftX - 1, leftY - 2, 4, 3, "#cbdba0");
      r(leftX - 1, leftY - 3, 1, 2, "#cbdba0");
      r(4, -10, rightX - 2, 2, "#b5cb8b");
      r(rightX, rightY, 2, -rightY - 8, "#b5cb8b");
      r(rightX - 1, rightY - 2, 4, 3, "#cbdba0");
      r(rightX + 2, rightY - 3, 1, 2, "#cbdba0");
      // Scissoring knees and mismatched kicks keep the whole body looking frantic.
      const [leftKick, rightKick] = [
        [-6, 4],
        [-4, 7],
        [-7, 5],
        [-5, 6],
      ][phase];
      r(-3, -3, 2, 4, "#484252");
      r(leftKick, -1, -leftKick - 1, 2, "#484252");
      r(leftKick, -1, 2, phase % 2 ? 5 : 2, "#484252");
      r(leftKick - 1, phase % 2 ? 3 : 0, 4, 2, "#b5cb8b");
      r(2, -3, 2, 4, "#484252");
      r(2, -1, rightKick, 2, "#484252");
      r(rightKick, -1, 2, phase % 2 ? 2 : 5, "#484252");
      r(rightKick, phase % 2 ? 0 : 3, 4, 2, "#b5cb8b");
    } else {
      r(-3, -3, 2, 3 + Math.max(0, leg), "#484252");
      r(2, -3, 2, 3 + Math.max(0, -leg), "#484252");
      r(-4, Math.max(0, leg), 4, 2, "#b5cb8b");
      r(1, Math.max(0, -leg), 4, 2, "#b5cb8b");
      r(4, -10, 6, 2, "#b5cb8b");
      r(8, -9, 2, 3, "#b5cb8b");
      r(-6, -9, 3, 5, "#8d9f70");
    }
    c.restore();
  }
  function drawBird(
    c,
    x,
    y,
    character,
    facing = 1,
    flap = false,
    grounded = false,
    scale = 1,
    time = 0,
    diving = false,
  ) {
    const b = birds[character];
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(scale * facing, scale);
    c.imageSmoothingEnabled = false;
    const r = (x, y, w, h, color) => {
      c.fillStyle = color;
      c.fillRect(x, y, w, h);
    };
    if (diving) {
      // Three stepped poses compress the wings against a vertical body.
      // Use simulation time so the pose and slipstream freeze while paused.
      const frame = Math.floor(time * 12) % 3;
      const tuck = [0, 1, 0][frame];
      const stream = Math.floor(time * 36) % 12;
      for (const [sx, phase] of [
        [-16, 0],
        [14, 6],
      ]) {
        r(sx, -30 - ((stream + phase) % 12), 2, 11, b.color + "70");
        r(sx + 1, -16 - ((stream + phase) % 8), 1, 5, b.light + "99");
      }
      // Tail first, head down: a narrow spear-shaped silhouette.
      r(-5, -21, 9, 13, b.dark);
      r(-3, -24, 5, 12, b.color);
      r(-6, -12, 13, 20, "#0c1625");
      r(-5, -13, 11, 20, b.dark);
      r(-2, -12, 7, 22, b.color);
      r(3, -7, 3, 13, b.light);
      // Folded wings trail upward instead of flapping out to the sides.
      r(-9 + tuck, -17, 4, 19, b.dark);
      r(-8 + tuck, -15, 2, 13, b.color);
      r(6 - tuck, -15, 4, 17, b.dark);
      r(7 - tuck, -13, 2, 12, b.light);
      if (b.mount === "dragon") {
        r(-4, 5, 11, 8, b.color);
        r(-2, 12, 7, 5, b.color);
        r(-5, 4, 2, 6, b.light);
        r(6, 4, 2, 6, b.light);
        r(-5, -26, 2, 7, b.light);
        r(-3, 9, 2, 2, "#111829");
      } else if (b.mount === "pegasus") {
        r(-3, 1, 8, 13, b.light);
        r(-2, 12, 6, 5, b.light);
        r(-5, 0, 3, 12, b.dark);
        r(3, 1, 3, 5, b.color);
        r(0, 10, 2, 2, "#111829");
        r(-5, -25, 7, 5, b.light);
        r(-10 + tuck, -16, 2, 11, b.light);
        r(-7, -3, 3, 7, b.light);
        r(-8, -4, 4, 2, b.dark);
      } else if (b.mount === "pterodactyl") {
        r(-3, 3, 8, 9, b.color);
        r(-2, 11, 5, 6, b.light);
        r(-1, 17, 2, 5, b.light);
        r(-4, -2, 3, 7, b.dark);
        r(-5, -5, 2, 4, b.color);
        r(-2, 7, 2, 2, "#111829");
      } else if (b.mount === "squirrel") {
        r(-9, -27, 15, 13, b.dark);
        r(-7, -29, 11, 11, b.color);
        r(-4, -27, 7, 5, b.light);
        r(-8, -15, 3, 19, b.light);
        r(6, -14, 3, 17, b.light);
        r(-4, 3, 10, 11, b.color);
        r(-5, 1, 3, 5, b.dark);
        r(4, 1, 3, 5, b.dark);
        r(-2, 10, 6, 6, b.light);
        r(-1, 15, 3, 3, "#322c30");
        r(2, 7, 2, 2, "#231f28");
      } else if (b.mount === "bee") {
        r(-4, -11, 10, 20, b.color);
        r(-4, -7, 10, 4, b.dark);
        r(-4, 1, 10, 4, b.dark);
        r(-10 + tuck, -18, 5, 16, "#edf0dc");
        r(7 - tuck, -17, 5, 16, "#bdcbd5");
        r(-3, 8, 9, 9, b.color);
        r(2, 11, 2, 2, b.dark);
        r(-4, 15, 2, 7, b.dark);
        r(5, 15, 2, 7, b.dark);
      } else if (b.mount === "moth") {
        r(-11 + tuck, -19, 6, 23, b.color);
        r(-9 + tuck, -16, 5, 23, b.light);
        r(6 - tuck, -17, 6, 22, b.light);
        r(-8 + tuck, -9, 3, 5, b.dark);
        r(7 - tuck, -7, 3, 5, b.dark);
        r(-3, 4, 9, 11, b.light);
        r(2, 9, 2, 2, "#343747");
        r(-4, 13, 2, 8, b.dark);
        r(6, 13, 2, 8, b.dark);
        r(-6, 17, 6, 2, b.color);
        r(4, 18, 6, 2, b.color);
      } else {
        r(-4, 3, 10, 9, b.color);
        r(-2, 6, 7, 6, b.light);
        // The same small tip dip, rotated with the diving bill.
        r(-2, 12, 5, 10, "#edbe78");
        r(-4, 20, 2, 2, "#edbe78");
        r(1, 12, 2, 8, "#ffe1aa");
        r(-2, 8, 2, 2, "#111829");
        r(-7, -24, 4, 8, b.color);
        r(-10 + tuck, -16, 2, 10, b.light);
      }
      // Rider leans flat against the mount, scarf streaming above the helmet.
      r(-9, -15, 5, 11, "#273447");
      r(-10, -4, 6, 6, "#eddbc2");
      r(-11, -5, 8, 3, b.color);
      r(-11, -2, 3, 4, b.dark);
      r(-5, 0, 2, 2, "#121e2a");
      r(-8, -13, 4, 8, b.light);
      r(-5, -7, 4, 3, "#273447");
      r(-12, -13, 3, 8, b.color);
      r(-13 + frame, -20, 2, 8, b.dark);
      c.restore();
      return;
    }
    // All artwork stays compact; mount choice never changes engine collision bounds.
    const walk = grounded ? Math.round(Math.sin(time * 24) * 2) : 0;
    const wing = (feathered = false) => {
      if (flap) {
        r(-7, -9, 5, 13, b.dark);
        r(-12, -15, 6, 10, b.color);
        r(-17, -20, 6, 7, b.light);
        if (!feathered) {
          r(-17, -13, 3, 5, b.color);
          r(-12, -8, 3, 5, b.color);
        }
      } else {
        r(-8, -2, 12, 6, b.dark);
        r(-13, 3, 12, 4, b.color);
        r(-17, 6, 8, 3, b.light);
        if (feathered) {
          r(-14, 8, 3, 3, b.light);
          r(-9, 8, 3, 3, b.light);
        }
      }
    };
    if (b.mount === "dragon") {
      r(-13, -5, 25, 13, b.dark);
      r(-11, -6, 23, 9, b.color);
      r(-6, 5, 16, 4, b.light);
      r(8, -11, 9, 11, b.color);
      r(14, -6, 7, 5, b.color);
      r(13, -10, 2, 2, "#111829");
      r(8, -15, 3, 5, b.light);
      r(15, -14, 3, 5, b.light);
      r(-19, 0, 8, 4, b.dark);
      r(-23, -4, 5, 5, b.color);
      r(-25, -8, 3, 5, b.light);
      wing();
      r(-8, 8, 4, 5 + walk, b.dark);
      r(6, 8, 4, 5 - walk, b.dark);
      r(-8, 12 + walk, 7, 2, b.light);
      r(6, 12 - walk, 7, 2, b.light);
    } else if (b.mount === "pegasus") {
      r(-13, -4, 25, 12, b.light);
      r(-10, 6, 20, 3, b.color);
      r(7, -11, 6, 12, b.light);
      r(10, -14, 8, 7, b.light);
      r(15, -10, 7, 4, b.light);
      r(11, -18, 3, 5, b.color);
      r(6, -14, 4, 13, b.dark);
      r(15, -12, 2, 2, "#111829");
      r(-18, 0, 5, 9, b.color);
      r(-21, 6, 6, 5, b.dark);
      wing(true);
      for (const [lx, offset] of [
        [-10, walk],
        [-5, -walk],
        [6, -walk],
        [10, walk],
      ]) {
        r(lx, 7, 2, 6 + offset, b.light);
        r(lx, 12 + offset, 4, 2, b.dark);
      }
    } else if (b.mount === "pterodactyl") {
      r(-11, -4, 22, 11, b.dark);
      r(-8, -5, 20, 9, b.color);
      r(-5, 5, 12, 4, b.light);
      r(6, -11, 8, 11, b.color);
      r(14, -8, 10, 3, b.light);
      r(20, -7, 6, 2, b.light);
      r(4, -15, 4, 6, b.dark);
      r(1, -18, 4, 5, b.color);
      r(11, -10, 2, 2, "#111829");
      r(-19, 0, 8, 3, b.dark);
      r(-23, -2, 5, 2, b.color);
      wing();
      r(-6, 8, 2, 5 + walk, b.color);
      r(4, 8, 2, 5 - walk, b.color);
      r(-7, 12 + walk, 5, 2, b.light);
      r(3, 12 - walk, 5, 2, b.light);
    } else if (b.mount === "squirrel") {
      // Curled bushy tail and a broad gliding membrane.
      r(-23, -11, 10, 19, b.dark);
      r(-25, -8, 8, 12, b.color);
      r(-21, -14, 8, 8, b.color);
      r(-18, -11, 5, 7, b.light);
      r(-16, 0, 8, 9, b.dark);
      r(-11, -5, 23, 13, b.color);
      r(-6, 4, 16, 5, b.light);
      if (!grounded) {
        r(-14, flap ? -13 : -4, 12, flap ? 18 : 14, b.dark);
        r(-12, flap ? -11 : -2, 10, flap ? 14 : 11, b.light);
        r(-9, flap ? -9 : 1, 10, 9, b.color);
        r(-15, flap ? -14 : 8, 4, 3, b.dark);
      }
      r(7, -12, 11, 11, b.color);
      r(8, -16, 4, 6, b.dark);
      r(14, -15, 3, 5, b.dark);
      r(11, -6, 9, 5, b.light);
      r(19, -6, 3, 3, "#322c30");
      r(14, -10, 2, 2, "#231f28");
      r(15, -1, 2, 2, "#fff1d2");
      r(-7, 8, 3, 5 + walk, b.dark);
      r(7, 8, 3, 5 - walk, b.dark);
      r(-8, 12 + walk, 6, 2, b.light);
      r(6, 12 - walk, 6, 2, b.light);
    } else if (b.mount === "bee") {
      r(-13, -6, 25, 14, b.dark);
      r(-10, -8, 19, 18, b.color);
      r(-14, -3, 28, 8, b.color);
      r(-8, -7, 4, 16, b.dark);
      r(1, -7, 4, 16, b.dark);
      r(-18, 0, 5, 2, b.dark);
      // Two translucent-looking pixel wings extend clear of the rider.
      r(-17, flap ? -18 : -10, 8, 10, "#bdcbd5");
      r(-15, flap ? -20 : -12, 6, 10, "#edf0dc");
      r(4, flap ? -17 : -10, 7, 9, "#bdcbd5");
      r(5, flap ? -19 : -12, 7, 8, "#edf0dc");
      r(9, -10, 10, 11, b.color);
      r(16, -7, 3, 3, b.dark);
      r(10, -15, 2, 6, b.dark);
      r(16, -14, 2, 5, b.dark);
      r(8, -17, 4, 3, b.dark);
      r(17, -16, 3, 3, b.dark);
      r(16, -2, 5, 2, b.light);
      for (const lx of [-8, 0, 8]) {
        r(lx, 8, 2, 4 + walk, b.dark);
        r(lx, 11 + walk, 5, 2, b.dark);
      }
    } else if (b.mount === "moth") {
      // Scalloped ivory wings, gray eyespots, and feathery antennae.
      const wy = flap ? -18 : -5;
      r(-24, wy + 3, 17, 12, b.dark);
      r(-21, wy, 13, 20, b.color);
      r(-18, wy + 2, 12, 20, b.light);
      r(-13, wy + 6, 9, 18, b.color);
      r(-20, wy + 7, 5, 5, b.dark);
      r(-19, wy + 8, 3, 3, b.light);
      r(-9, -4, 20, 13, b.color);
      r(-6, 0, 16, 12, b.light);
      r(0, 4, 6, 5, b.dark);
      r(1, 5, 4, 3, b.color);
      r(-5, -7, 12, 16, b.dark);
      r(-2, -6, 7, 17, b.color);
      r(6, -12, 10, 12, b.light);
      r(13, -9, 2, 3, "#343747");
      r(7, -18, 2, 7, b.dark);
      r(13, -18, 2, 7, b.dark);
      r(5, -18, 6, 2, b.color);
      r(11, -20, 6, 2, b.color);
      r(5, -15, 6, 2, b.color);
      r(-4, 9, 2, 4 + walk, b.dark);
      r(5, 9, 2, 4 - walk, b.dark);
    } else {
      r(-14, -3, 26, 12, "#0c1625");
      r(-11, -6, 20, 16, b.dark);
      r(-10, -5, 19, 10, b.color);
      r(-7, 5, 15, 4, b.light);
      r(6, -10, 9, 10, b.color);
      r(11, -8, 4, 4, b.light);
      r(12, -7, 2, 2, "#111829");
      // A broad bill with just a small downward dip at the tip.
      r(15, -7, 10, 5, "#edbe78");
      r(23, -2, 2, 2, "#edbe78");
      r(15, -7, 9, 2, "#ffe1aa");
      r(-18, -2, 7, 4, b.dark);
      r(-21, -5, 5, 4, b.color);
      wing(true);
      r(-7, 9, 2, 4 + walk, "#edbe78");
      r(4, 9, 2, 4 - walk, "#edbe78");
      r(-7, 12 + walk, 5, 2, "#edbe78");
      r(4, 12 - walk, 5, 2, "#edbe78");
    }
    r(-5, -15, 8, 9, "#273447");
    r(-4, -19, 7, 6, "#eddbc2");
    r(-6, -21, 10, 4, b.color);
    r(-6, -18, 3, 4, b.dark);
    r(1, -18, 2, 2, "#121e2a");
    r(-4, -12, 6, 5, b.light);
    r(-2, -7, 7, 3, "#263447");
    r(-10, -14, 6, 3, b.color);
    r(-14, -13, 5, 3, b.dark);
    c.restore();
  }
  function pixelCloud(c, x, y, scale, color) {
    c.fillStyle = color;
    [
      [0, 12, 100, 10],
      [12, 3, 24, 15],
      [28, -6, 30, 25],
      [50, 2, 29, 18],
      [77, 8, 17, 12],
    ].forEach(([a, b, w, h]) =>
      c.fillRect(x + a * scale, y + b * scale, w * scale, h * scale),
    );
  }
  // Cache the landscape. Animation only redraws birds, motes and effects.
  const background = document.createElement("canvas");
  background.width = W;
  background.height = H;
  const bg = background.getContext("2d");
  function drawArenaSky(g, arena) {
    const polygon = (points, color) => {
      g.fillStyle = color;
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fill();
    };
    if (arena.motif === "sun") {
      // An amber sun and distant wind-carved mesas.
      g.fillStyle = "#edbf7f35";
      g.beginPath();
      g.arc(960, 330, 145, 0, Math.PI * 2);
      g.fill();
      for (const x of [50, 470, 1230, 1650]) {
        polygon(
          [
            [x, 920],
            [x + 25, 640],
            [x + 75, 640],
            [x + 75, 590],
            [x + 170, 590],
            [x + 210, 920],
          ],
          "#593b4330",
        );
      }
    } else if (arena.motif === "ice") {
      // Angular aurora curtains above snow-capped spires.
      for (let band = 0; band < 3; band++) {
        for (let x = 0; x < W; x += 24) {
          const y = 160 + band * 48 + Math.sin(x * 0.004 + band) * 55;
          g.fillStyle = ["#71d8be16", "#83bfea18", "#b1a6ee12"][band];
          g.fillRect(x, y, 24, 80 + Math.sin(x * 0.007) * 35);
        }
      }
      for (const x of [80, 400, 1170, 1510]) {
        polygon(
          [
            [x, 940],
            [x + 160, 430],
            [x + 330, 940],
          ],
          "#7da5b31c",
        );
        polygon(
          [
            [x + 119, 560],
            [x + 160, 430],
            [x + 207, 570],
            [x + 161, 539],
          ],
          "#c4e8eb25",
        );
      }
    } else if (arena.motif === "crystal") {
      // Broken sky-temple columns, with floating amethyst shards.
      for (const x of [130, 410, 1430, 1710]) {
        g.fillStyle = "#a58fc21b";
        g.fillRect(x, 470, 48, 490);
        g.fillRect(x - 16, 450, 80, 22);
        g.fillRect(x - 8, 690, 64, 16);
      }
      for (const [x, y, h] of [
        [600, 310, 90],
        [960, 230, 130],
        [1320, 310, 90],
      ]) {
        polygon(
          [
            [x, y - h],
            [x + 35, y],
            [x, y + h],
            [x - 35, y],
          ],
          "#c4a6ec25",
        );
        polygon(
          [
            [x, y - h],
            [x + 35, y],
            [x, y + h],
          ],
          "#d9c6f01c",
        );
      }
    } else if (arena.motif === "forest") {
      // Tall, quiet conifers rise through layered green mist.
      for (const [x, h] of [
        [80, 460],
        [350, 650],
        [670, 470],
        [1100, 470],
        [1420, 650],
        [1690, 460],
      ]) {
        g.fillStyle = "#142e3438";
        g.fillRect(x + 70, 1010 - h, 20, h);
        for (let tier = 0; tier < 4; tier++) {
          const y = 1010 - h + tier * 85;
          polygon(
            [
              [x + 80, y - 100],
              [x + 180 + tier * 8, y + 120],
              [x - 20 - tier * 8, y + 120],
            ],
            "#183b3930",
          );
        }
      }
      for (const y of [460, 670, 850]) {
        g.fillStyle = "#b7c8a80a";
        g.fillRect(0, y, W, 42);
      }
    } else if (arena.motif === "volcano") {
      // A split volcanic crown and muted lava seams below the islands.
      polygon(
        [
          [580, 1000],
          [850, 485],
          [920, 520],
          [1000, 520],
          [1070, 485],
          [1340, 1000],
        ],
        "#211e2d60",
      );
      polygon(
        [
          [850, 485],
          [920, 520],
          [1000, 520],
          [1070, 485],
          [1020, 566],
          [902, 556],
        ],
        "#ed97652e",
      );
      polygon(
        [
          [955, 545],
          [982, 650],
          [950, 735],
          [1010, 840],
          [972, 820],
          [930, 730],
          [963, 642],
        ],
        "#e8825630",
      );
    }
  }
  function buildBackground(arena = ARENAS[0]) {
    const gradient = bg.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, arena.sky[0]);
    gradient.addColorStop(0.58, arena.sky[1]);
    gradient.addColorStop(1, arena.sky[2]);
    bg.fillStyle = gradient;
    bg.fillRect(0, 0, W, H);
    if (arena.motif === "moon") {
      // The hollow moon sits behind the islands.
      bg.fillStyle = "#d6bd9220";
      bg.beginPath();
      bg.arc(1525, 285, 115, 0, Math.PI * 2);
      bg.fill();
      bg.fillStyle = "#d6bd9230";
      bg.beginPath();
      bg.arc(1525, 285, 88, 0, Math.PI * 2);
      bg.fill();
      bg.fillStyle = "#192c40";
      bg.beginPath();
      bg.arc(1494, 262, 82, 0, Math.PI * 2);
      bg.fill();
    } else drawArenaSky(bg, arena);
    let seed = 173 + ARENAS.indexOf(arena) * 317;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 145; i++) {
      bg.fillStyle = i % 5 === 0 ? "#e5c79770" : "#a6c6c434";
      const x = rand() * W,
        y = 120 + rand() * 780;
      bg.fillRect(
        Math.round(x / 2) * 2,
        Math.round(y / 2) * 2,
        i % 9 === 0 ? 3 : 2,
        2,
      );
    }
    [
      [60, 380, 2],
      [680, 300, 1.4],
      [1320, 680, 2.4],
      [180, 840, 2.8],
      [910, 920, 1.8],
      [1690, 380, 1.8],
    ].forEach((p) => pixelCloud(bg, ...p, "#8db9b30b"));
    // Distant mountains form a quiet silhouette below the flight space.
    for (let layer = 0; layer < 3; layer++) {
      bg.fillStyle = arena.mountains[layer];
      bg.beginPath();
      bg.moveTo(0, H);
      for (let x = 0; x <= W + 80; x += 80)
        bg.lineTo(
          x,
          820 + layer * 58 + Math.sin(x * 0.008 + layer * 5) * 65 + rand() * 45,
        );
      bg.lineTo(W, H);
      bg.fill();
    }
    for (const p of arena.platforms) {
      const depth = p.ground ? 70 : PLATFORM_DEPTH,
        x = p.x,
        y = p.y,
        w = p.w;
      bg.fillStyle = "#121e2d";
      bg.fillRect(x - 3, y + 4, w + 6, 14);
      bg.fillStyle = arena.rock;
      bg.beginPath();
      bg.moveTo(x, y + 6);
      bg.lineTo(x + w, y + 6);
      bg.lineTo(x + w - 19, y + depth - 6);
      bg.lineTo(x + w * 0.65, y + depth);
      bg.lineTo(x + w * 0.56, y + depth + 20);
      bg.lineTo(x + w * 0.45, y + depth + 6);
      bg.lineTo(x + 20, y + depth - 3);
      bg.closePath();
      bg.fill();
      bg.fillStyle = arena.top;
      bg.fillRect(x, y, w, 9);
      bg.fillStyle = arena.rim;
      bg.fillRect(x, y, w, 3);
      bg.fillStyle = arena.id === "hollow" ? "#b5ba88" : arena.accent;
      bg.fillRect(x + 8, y, w * 0.25, 2);
      for (let j = 0; j < w / 13; j++) {
        const rx = x + rand() * w;
        bg.fillStyle = rand() > 0.5 ? "#47514d" : "#283740";
        bg.fillRect(
          Math.floor(rx / 4) * 4,
          y + 12 + Math.floor((rand() * depth) / 4) * 4,
          8 + Math.floor(rand() * 4) * 4,
          4,
        );
      }
      if (!p.ground)
        for (let j = 0; j < 3; j++) {
          const vx = x + 25 + rand() * (w - 50),
            len = 25 + rand() * 65;
          bg.fillStyle =
            arena.id === "hollow" ? "#4e6e64" : arena.accent + "70";
          bg.fillRect(Math.floor(vx / 2) * 2, y + 20, 2, len);
          for (let k = 8; k < len; k += 13)
            bg.fillRect(vx + (k % 2 ? -3 : 1), y + 20 + k, 4, 2);
        }
      if (!p.ground) {
        bg.fillStyle = arena.accent;
        for (let j = 0; j < 4; j++) {
          const gx = x + 20 + rand() * (w - 40);
          bg.fillRect(gx, y - 5, 2, 5);
          bg.fillRect(gx - 3, y - 3, 8, 2);
        }
      }
    }
    if (arena.id === "crystal") {
      for (const p of arena.graves) {
        const gx = p.x;
        bg.fillStyle = "#252a38";
        bg.fillRect(gx - 10, p.y - 20, 20, 20);
        bg.fillRect(gx - 7, p.y - 24, 14, 4);
        bg.fillStyle = "#85828e";
        bg.fillRect(gx - 8, p.y - 19, 16, 18);
        bg.fillRect(gx - 5, p.y - 22, 10, 4);
        bg.fillStyle = "#424251";
        bg.fillRect(gx - 1, p.y - 17, 2, 11);
        bg.fillRect(gx - 4, p.y - 14, 8, 2);
        bg.fillStyle = "#62566b";
        bg.fillRect(gx - 14, p.y - 3, 28, 3);
      }
    }
  }
  buildBackground();
  function sparkle(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x) - size, Math.round(y), size * 2 + 1, 2);
    ctx.fillRect(Math.round(x), Math.round(y) - size, 2, size * 2 + 1);
  }
  function render(dt) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(background, 0, 0);
    const active =
      match &&
      ["match", "countdown", "ending", "pause", "results"].includes(screen);
    if (!active) {
      ctx.fillStyle = "#0c15274a";
      ctx.fillRect(0, 0, W, H);
      // Menu birds stay near the outer islands so the title has clear space.
      const positions = [
        [270, 232],
        [1630, 232],
        [535, 762],
        [1375, 762],
      ];
      if (screen === "menu")
        positions.forEach(([x, y], i) => {
          const flying = i < 2;
          drawBird(
            ctx,
            x + Math.sin(clock * 0.6 + i) * 30,
            y + (flying ? Math.sin(clock * 2 + i) * 10 : 0),
            i,
            i % 2 ? -1 : 1,
            flying && Math.sin(clock * 9 + i) > 0.2,
            !flying,
            1.75,
            clock,
          );
        });
      if (screen === "lobby") {
        ctx.fillStyle = "#101b2b55";
        ctx.fillRect(0, 100, W, H - 180);
      }
    } else {
      if (match.eruption) {
        const warningAge = match.time - match.eruption.start;
        if (warningAge < 1.2) {
          ctx.fillStyle = `rgba(255, 185, 100, ${0.24 * Math.max(0, 1 - warningAge / 1.2)})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
      for (const f of match.volcanoFireballs) {
        ctx.fillStyle = "#ff803e80";
        ctx.fillRect(f.x - 5, f.y - 27, 10, 22);
        drawFireball(f.x, f.y);
      }
      for (const z of match.zombies) {
        drawZombie(ctx, z, match.time);
        if (z.x < 18) drawZombie(ctx, { ...z, x: z.x + W }, match.time);
        if (z.x > W - 18) drawZombie(ctx, { ...z, x: z.x - W }, match.time);
      }
      if (match.pickup) {
        const p = match.pickup,
          y = p.y + Math.sin(clock * 4) * 4;
        const glow = ctx.createRadialGradient(p.x, y, 2, p.x, y, 44);
        glow.addColorStop(0, "#ffe7a340");
        glow.addColorStop(1, "#ffe7a300");
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - 44, y - 44, 88, 88);
        if (p.ttl > 3 || Math.sin(clock * 14) > 0) {
          ctx.save();
          ctx.translate(p.x, y);
          ctx.rotate(0.5);
          ctx.fillStyle = "#f9d67e";
          ctx.fillRect(-4, -12, 8, 20);
          ctx.fillStyle = "#fff0bf";
          ctx.fillRect(-1, -14, 3, 29);
          ctx.fillStyle = "#b48c51";
          ctx.fillRect(-4, 4, 3, 6);
          ctx.restore();
          sparkle(p.x + 18, y - 12, 3, "#ffeac1");
        }
      }
      if (match.powerPickup) {
        const p = match.powerPickup,
          y = p.y + Math.sin(clock * 4) * 4;
        if (p.ttl > 3 || Math.sin(clock * 14) > 0) {
          const glow = ctx.createRadialGradient(p.x, y, 2, p.x, y, 44);
          glow.addColorStop(0, powerColor[p.kind] + "40");
          glow.addColorStop(1, powerColor[p.kind] + "00");
          ctx.fillStyle = glow;
          ctx.fillRect(p.x - 44, y - 44, 88, 88);
          if (p.kind === "flame") drawFireball(p.x, y);
          else if (p.kind === "sawblade") drawSaw(p.x, y, clock * 6, 20);
          else drawRocketPickup(p.x, y);
        }
      }
      for (const f of match.projectiles) drawFireball(f.x, f.y);
      for (const p of match.players) {
        if (!p.alive) {
          if (p.lives > 0) {
            ctx.fillStyle = "#c9d6cd70";
            ctx.font = "14px Silkscreen";
            ctx.textAlign = "center";
            ctx.fillText(`${Math.ceil(p.respawn)}`, p.x, p.y - 30);
          }
          continue;
        }
        const b = birds[p.character];
        if (p.boosting) {
          ctx.fillStyle = b.color + "88";
          ctx.fillRect(p.x - p.facing * 47, p.y - 5, 25, 3);
          ctx.fillRect(p.x - p.facing * 38, p.y + 2, 16, 2);
        }
        if (p.grounded) {
          ctx.fillStyle = "#0a132b55";
          ctx.fillRect(p.x - 17, p.y + 11, 34, 3);
        }
        for (const offset of [
          0,
          ...(p.x < 85 ? [W] : p.x > W - 85 ? [-W] : []),
        ]) {
          const x = p.x + offset;
          if (p.power === "rocket") drawRocketExhaust(p, x);
          if (p.power === "sawblade") drawSaw(x, p.y, match.time * 32);
          else
            drawBird(
              ctx,
              x,
              p.y,
              p.character,
              p.facing,
              p.flapTimer > 0,
              p.grounded,
              1,
              p.diving && !p.grounded
                ? match.time
                : Math.abs(p.vx) > 15
                  ? clock
                  : 0,
              p.diving && !p.grounded,
            );
          if (p.power === "flame")
            for (const f of match.fireballs(p)) drawFireball(f.x + offset, f.y);
          ctx.font = "bold 14px Silkscreen";
          ctx.textAlign = "center";
          ctx.fillStyle = b.color;
          const nameOffset =
            p.power === "rocket" && p.diving && !p.grounded ? 70 : 34;
          ctx.fillText(playerName(p), x, p.y - nameOffset);
          if (mode === "teams") {
            ctx.fillStyle = TEAMS[p.team].color;
            ctx.fillRect(x - 23, p.y + 19, 46, 5);
            ctx.fillRect(x - 26, p.y + 16, 4, 10);
            ctx.fillRect(x + 22, p.y + 16, 4, 10);
            ctx.font = "12px Silkscreen";
            ctx.fillText(TEAMS[p.team].name, x, p.y - nameOffset - 16);
          }
          if (p.invincible > 0) {
            ctx.strokeStyle = "#fff0c677";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(x, p.y - 4, 29, 30, 0, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 5; i++) {
              const a = clock * 3 + (i * Math.PI * 2) / 5;
              sparkle(
                x + Math.cos(a) * 29,
                p.y - 4 + Math.sin(a) * 30,
                2,
                "#fff0c6",
              );
            }
          }
        }
      }
    }
    if (screen !== "pause")
      for (const p of particles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 180 * dt;
        p.angle += dt * 5;
      }
    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -1, p.size * 2, 3);
      ctx.restore();
    }
    // Soft scanlines, kept faint enough for small characters to remain legible.
    ctx.fillStyle = "#050d180d";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  }
  function frame(timestamp) {
    const dt = Math.min((timestamp - last) / 1000 || 0, 0.05);
    last = timestamp;
    clock += dt;
    pollPads();
    if (screen === "countdown") {
      const before = Math.ceil(countdown);
      countdown -= dt;
      $("announcement").className = "countdown";
      $("announcement").textContent =
        countdown > 0.3 ? Math.ceil(countdown) : "FLY!";
      if (Math.ceil(countdown) !== before)
        tone(300 + (3 - Math.ceil(countdown)) * 100, 0.1);
      if (countdown <= 0) {
        countdown = 0;
        show("match");
        broadcast.say("round", { r: series.rounds.length + 1 });
      }
      tapped.clear();
      pendingFlaps.clear();
      pendingBoosts.clear();
    } else if (screen === "match") {
      accumulator += dt;
      while (accumulator >= STEP && screen === "match") {
        match.step(
          STEP,
          match.players.map((p) => inputFor(p, STEP)),
        );
        processEvents();
        accumulator -= STEP;
        if (match.winner) {
          endingTime = 1.6;
          show("ending");
          updateHud();
        }
      }
      hudClock += dt;
      if (hudClock > 0.12) {
        updateHud();
        hudClock = 0;
      }
    } else if (screen === "ending") {
      // Keep the final arena and feather particles visible before the overlay.
      // Combat is already settled, so only presentation time advances here.
      endingTime -= dt;
      tapped.clear();
      pendingFlaps.clear();
      pendingBoosts.clear();
      if (endingTime <= 0) finish();
    } else {
      tapped.clear();
      pendingFlaps.clear();
      pendingBoosts.clear();
    }
    if (["match", "ending"].includes(screen)) {
      const call = broadcast.step(dt);
      if ($("commentary").textContent !== call)
        $("commentary").textContent = call;
    }
    $("commentary").className = broadcast.current ? "" : "is-dimmed";
    $("announcer").className =
      ["match", "ending"].includes(screen) && broadcast.current
        ? "is-talking"
        : "";
    render(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
