/* Featherfall presentation and local input. */
(() => {
  "use strict";
  const {
    W,
    H,
    CHARACTERS: birds,
    PLATFORMS,
    PLATFORM_DEPTH,
    Match,
    botInput,
    gamepadState,
    edges,
  } = Featherfall;
  const $ = (id) => document.getElementById(id);
  const canvas = $("arena"),
    ctx = canvas.getContext("2d");
  const keys = [
    { left: "KeyA", right: "KeyD", flap: "KeyW", label: "A / D MOVE · W FLAP" },
    {
      left: "ArrowLeft",
      right: "ArrowRight",
      flap: "ArrowUp",
      label: "← / → MOVE · ↑ FLAP",
    },
    { left: "KeyJ", right: "KeyL", flap: "KeyI", label: "J / L MOVE · I FLAP" },
    { left: "KeyF", right: "KeyH", flap: "KeyT", label: "F / H MOVE · T FLAP" },
  ];
  let screen = "menu",
    seats = [null, null, null, null],
    mode = "ffa",
    match = null;
  let countdown = 0,
    clock = 0,
    last = 0,
    accumulator = 0,
    hudClock = 0,
    noticeTime = 0;
  let pressed = new Set(),
    tapped = new Set(),
    padPrevious = new Map(),
    padMove = new Map(),
    padFrames = new Map(),
    pendingFlaps = new Set();
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
    for (const id of ["sound", "sound-play"]) {
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
    if (!event.target.closest?.("#sound, #sound-play")) audioUnlock();
  });
  function show(next) {
    screen = next;
    for (const id of ["menu", "lobby", "pause", "results"])
      $(id).hidden = next !== id;
    const inArena = ["match", "countdown", "pause", "results"].includes(next);
    $("hud").hidden = !inArena;
    document.body.classList.toggle("playing", inArena);
    $("announcement").textContent = "";
    $("announcement").className = "";
    noticeTime = 0;
    pressed.clear();
    tapped.clear();
    pendingFlaps.clear();
    accumulator = 0;
    if (next === "lobby") {
      renderSeats();
      $("launch").focus();
    }
    if (next === "menu") $("start").focus();
    if (next === "pause") $("resume").focus();
    if (next === "results") $("rematch").focus();
  }
  function announce(text, seconds = 2.5) {
    $("announcement").textContent = text;
    noticeTime = seconds;
  }
  function availableCharacter(start, direction, seatIndex) {
    let candidate = start;
    for (let n = 0; n < 4; n++) {
      candidate = (candidate + direction + 4) % 4;
      if (!seats.some((s, i) => i !== seatIndex && s?.character === candidate))
        return candidate;
    }
    return start;
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
      character: availableCharacter(slot - 1, 1, slot),
      team: slot % 2,
      ready: kind !== "pad",
    };
    tone(460, 0.1, "triangle", 0.05, 700);
    renderSeats();
  }
  function rotate(slot, direction) {
    if (!seats[slot]) return;
    const previous = seats[slot].character,
      next = (previous + direction + 4) % 4;
    const owner = seats.find((s) => s?.character === next);
    if (owner) {
      owner.character = previous;
      if (owner.kind === "pad") owner.ready = false;
    }
    seats[slot].character = next;
    if (seats[slot].kind === "pad") seats[slot].ready = false;
    renderSeats();
  }
  function changeMode() {
    mode = mode === "ffa" ? "teams" : "ffa";
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
      `${mode === "ffa" ? "FREE FOR ALL" : "TWO TEAMS"} <span>⇄</span>`;
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
        return `<article class="seat joined" style="--bird:${b.color}"><div class="seat-label"><b>PLAYER 0${i + 1}</b><span>${source}</span></div><canvas id="preview-${i}" width="168" height="100" aria-label="${b.name} bird rider"></canvas><div class="character-picker"><button data-action="prev" data-seat="${i}" aria-label="Previous character for player ${i + 1}">‹</button><div><h3>${b.name}</h3><span class="bird-type">${b.bird}</span></div><button data-action="next" data-seat="${i}" aria-label="Next character for player ${i + 1}">›</button></div><div class="seat-controls">${s.kind === "keyboard" ? keys[s.source].label : s.kind === "pad" ? "STICK MOVE · TAP A TO FLAP" : "AUTOPILOT · SAME RULES AS YOU"}</div><div class="seat-actions">${mode === "teams" ? `<button data-action="team" data-seat="${i}">${s.team === 0 ? "SUN TEAM" : "MOON TEAM"} ⇄</button>` : ""}<button class="remove" data-action="remove" data-seat="${i}">LEAVE ×</button></div><div class="ready">${s.ready ? "● READY TO FLY" : "PRESS START TO READY"}</div></article>`;
      })
      .join("");
    seats.forEach((s, i) => {
      if (s) {
        const c = $(`preview-${i}`).getContext("2d");
        drawBird(c, 84, 55, s.character, 1, false, true, 3.4, clock);
      }
    });
    $("add-bot").disabled = seats.every(Boolean);
    $("launch").disabled = !canStart();
    const count = seats.filter(Boolean).length;
    $("lobby-message").textContent =
      count < 2
        ? "Join a second player or add a practice bot."
        : !canStart()
          ? "Put at least one rider on each team."
          : "Enter to launch · controllers press Start to ready";
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
    if (action === "team" && seats[i]) {
      seats[i].team ^= 1;
      renderSeats();
    }
  });
  function startMatch() {
    if (!canStart()) return;
    audioUnlock();
    match = new Match(
      seats
        .filter(Boolean)
        .map((s, slot) => ({ ...s, slot: seats.indexOf(s) })),
      mode,
    );
    particles = [];
    countdown = 3;
    show("countdown");
    updateHud();
    tone(300, 0.15);
  }
  function pause(reason = "The sky can wait.", disconnect = false) {
    if (!["match", "countdown"].includes(screen)) return;
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
    show(countdown > 0 ? "countdown" : "match");
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
  $("launch").onclick = startMatch;
  $("pause-button").onclick = () => pause();
  $("resume").onclick = resume;
  $("quit").onclick = $("change-players").onclick = () => show("lobby");
  $("rematch").onclick = startMatch;
  $("home-link").onclick = (e) => {
    e.preventDefault();
    if (screen === "lobby") show("menu");
  };
  $("sound").onclick = $("sound-play").onclick = () => {
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
  $("fullscreen").onclick = fullscreen;
  // Ignore key repeat: every upward impulse must come from a fresh flap press.
  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const gameKey =
      keys.some((k) => [k.left, k.right, k.flap].includes(e.code)) ||
      ["Enter", "Escape", "Digit1", "Digit2", "Digit3", "Digit4"].includes(
        e.code,
      );
    if (gameKey) e.preventDefault();
    if (e.repeat) return;
    pressed.add(e.code);
    tapped.add(e.code);
    if (e.code === "KeyM") {
      $("sound").click();
      return;
    }
    audioUnlock();
    if (e.code === "Enter") {
      if (screen === "menu") show("lobby");
      else if (screen === "lobby" || screen === "results") startMatch();
      else if (screen === "pause") resume();
    } else if (e.code === "Escape") {
      if (["match", "countdown"].includes(screen)) pause();
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
        }
      });
    }
  });
  addEventListener("keyup", (e) => pressed.delete(e.code));
  addEventListener("blur", () => {
    pressed.clear();
    tapped.clear();
    pendingFlaps.clear();
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
      if (screen === "menu" && edge.start) {
        show("lobby");
        join("pad", pad.index);
        continue;
      }
      if (screen === "lobby") {
        let slot = seats.findIndex(
          (s) => s?.kind === "pad" && s.source === pad.index,
        );
        if (slot < 0 && edge.start) {
          join("pad", pad.index);
          continue;
        }
        if (slot >= 0) {
          if (edge.back) {
            seats[slot] = null;
            renderSeats();
            continue;
          }
          if (moveEdge) rotate(slot, dir);
          if (edge.team && mode === "teams") {
            seats[slot].team ^= 1;
            renderSeats();
          }
          if (edge.mode) changeMode();
          if (edge.start) {
            seats[slot].ready = !seats[slot].ready;
            renderSeats();
            if (canStart() && seats.filter(Boolean).every((s) => s.ready))
              startMatch();
          }
        }
      } else if (["match", "countdown"].includes(screen)) {
        if (
          edge.start &&
          match.players.some((p) => p.kind === "pad" && p.source === pad.index)
        )
          pause();
        if (edge.flap) pendingFlaps.add(pad.index);
      } else if (screen === "pause" && edge.start) resume();
      else if (screen === "results") {
        if (edge.start) startMatch();
        else if (edge.back) show("lobby");
      }
    }
    if (
      ["match", "countdown"].includes(screen) &&
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
      };
    const mapping = keys[p.source],
      flap = tapped.delete(mapping.flap);
    return {
      move:
        Number(pressed.has(mapping.right)) - Number(pressed.has(mapping.left)),
      flap,
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
  function processEvents() {
    for (const event of match.events) {
      const color =
        event.id !== undefined
          ? birds[match.players[event.id].character].color
          : "#ffe9b4";
      if (event.type === "death") {
        burst(event.x, event.y, color, 35, 1.5);
        burst(event.x, event.y, "#eee7d3", 10);
        sound.play("death");
      }
      if (event.type === "spawn") burst(event.x, event.y, "#fff1c8", 16, 0.4);
      if (event.type === "flap") {
        burst(event.x, event.y + 8, color, 2, 0.15);
        sound.play("flap");
      }
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
        announce(
          `${birds[match.players[event.id].character].name} ${event.maxReached ? "MAX LIVES REACHED" : "+1 LIFE"}`,
        );
        tone(660, 0.35, "triangle", 0.07, 1320);
      }
      if (event.type === "pickup") {
        announce("A GOLDEN FEATHER HAS APPEARED");
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
        return `<div class="hud-player ${p.lives === 0 ? "out" : ""}" style="--bird:${b.color}"><div class="name">P${p.slot + 1} ${b.name}${mode === "teams" ? ` · ${p.team === 0 ? "SUN" : "MOON"}` : ""}</div><div class="lives">${p.lives > 8 ? `♥ × ${p.lives}` : "♥".repeat(p.lives) || "OUT"}</div><div class="meta">${!p.alive && p.lives ? `RETURNING IN ${Math.ceil(p.respawn)}…` : `${p.kills} KO · ${p.kind === "bot" ? "BOT" : p.kind === "pad" ? "PAD " + (p.source + 1) : "KEYS " + (p.source + 1)}`}</div></div>`;
      })
      .join("");
    const time = Math.floor(match.time);
    $("match-time").textContent =
      `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
    $("match-mode").textContent =
      mode === "ffa" ? "FREE FOR ALL" : "TEAM BATTLE";
  }
  function finish() {
    updateHud();
    show("results");
    tone(440, 0.6, "triangle", 0.06, 880);
    const result = match.winner,
      winner = match.players.find((p) => p.id === result.id),
      teamName = result.team === 0 ? "Sun team" : "Moon team";
    $("winner-title").textContent = result.draw
      ? "A sky without a winner."
      : mode === "teams"
        ? `${teamName} wins!`
        : `${birds[winner.character].name} takes the sky!`;
    $("winner-subtitle").textContent = "One big sky. A whole lot of feathers.";
    $("scoreboard").innerHTML = [...match.players]
      .sort((a, b) => b.lives - a.lives || b.kills - a.kills)
      .map(
        (p) =>
          `<div><span style="color:${birds[p.character].color}">P${p.slot + 1} ${birds[p.character].name}${mode === "teams" ? ` · ${p.team === 0 ? "SUN" : "MOON"}` : ""}</span><span>${p.kills} KO &nbsp; · &nbsp; ${p.lives} ${p.lives === 1 ? "LIFE" : "LIVES"} LEFT</span></div>`,
      )
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
  // Original pixel birds: a small rider, compact body, beak and animated wings.
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
    r(-14, -3, 26, 12, "#0c1625");
    r(-11, -6, 20, 16, b.dark);
    r(-10, -5, 19, 10, b.color);
    r(-7, 5, 15, 4, b.light);
    r(6, -10, 9, 10, b.color);
    r(11, -8, 4, 4, b.light);
    r(12, -7, 2, 2, "#111829");
    r(15, -5, 6, 3, "#edc06e");
    r(-18, -2, 7, 4, b.dark);
    r(-21, -5, 5, 4, b.color);
    if (flap) {
      r(-8, -12, 5, 15, b.dark);
      r(-13, -17, 6, 10, b.color);
      r(-16, -20, 4, 8, b.light);
    } else {
      r(-8, -2, 12, 6, b.dark);
      r(-11, 2, 11, 4, b.color);
      r(-13, 5, 7, 3, b.light);
    }
    const walk = grounded ? Math.round(Math.sin(time * 24) * 2) : 0;
    r(-7, 9, 2, 4 + walk, "#edbe78");
    r(4, 9, 2, 4 - walk, "#edbe78");
    r(-7, 12 + walk, 5, 2, "#edbe78");
    r(4, 12 - walk, 5, 2, "#edbe78");
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
  function buildBackground() {
    const gradient = bg.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#101a2d");
    gradient.addColorStop(0.58, "#1b3548");
    gradient.addColorStop(1, "#395455");
    bg.fillStyle = gradient;
    bg.fillRect(0, 0, W, H);
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
    let seed = 173;
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
      bg.fillStyle = ["#294650", "#243e48", "#203944"][layer];
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
    for (const p of PLATFORMS) {
      const depth = p.ground ? 70 : PLATFORM_DEPTH,
        x = p.x,
        y = p.y,
        w = p.w;
      bg.fillStyle = "#121e2d";
      bg.fillRect(x - 3, y + 4, w + 6, 14);
      bg.fillStyle = "#354247";
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
      bg.fillStyle = "#59605a";
      bg.fillRect(x, y, w, 9);
      bg.fillStyle = "#92a584";
      bg.fillRect(x, y, w, 3);
      bg.fillStyle = "#b5ba88";
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
          bg.fillStyle = "#4e6e64";
          bg.fillRect(Math.floor(vx / 2) * 2, y + 20, 2, len);
          for (let k = 8; k < len; k += 13)
            bg.fillRect(vx + (k % 2 ? -3 : 1), y + 20 + k, 4, 2);
        }
      if (!p.ground) {
        bg.fillStyle = "#91ae92";
        for (let j = 0; j < 4; j++) {
          const gx = x + 20 + rand() * (w - 40);
          bg.fillRect(gx, y - 5, 2, 5);
          bg.fillRect(gx - 3, y - 3, 8, 2);
        }
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
      match && ["match", "countdown", "pause", "results"].includes(screen);
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
      for (const p of match.players) {
        if (!p.alive) {
          if (p.lives > 0) {
            ctx.fillStyle = "#c9d6cd70";
            ctx.font = "11px monospace";
            ctx.textAlign = "center";
            ctx.fillText(`${Math.ceil(p.respawn)}`, p.x, p.y - 30);
          }
          continue;
        }
        const b = birds[p.character];
        if (p.grounded) {
          ctx.fillStyle = "#0a132b55";
          ctx.fillRect(p.x - 17, p.y + 11, 34, 3);
        }
        for (const offset of [
          0,
          ...(p.x < 30 ? [W] : p.x > W - 30 ? [-W] : []),
        ]) {
          const x = p.x + offset;
          drawBird(
            ctx,
            x,
            p.y,
            p.character,
            p.facing,
            p.flapTimer > 0,
            p.grounded,
            1,
            Math.abs(p.vx) > 15 ? clock : 0,
          );
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = b.color;
          ctx.fillText(`P${p.slot + 1}`, x, p.y - 32);
          if (mode === "teams") {
            ctx.fillStyle = p.team === 0 ? "#ffd888" : "#b8c5ff";
            ctx.fillRect(x - 7, p.y - 48, 14, 3);
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
        announce("TAKE THE HIGH GROUND", 1.7);
      }
      tapped.clear();
      pendingFlaps.clear();
    } else if (screen === "match") {
      accumulator += dt;
      while (accumulator >= STEP && screen === "match") {
        match.step(
          STEP,
          match.players.map((p) => inputFor(p, STEP)),
        );
        processEvents();
        accumulator -= STEP;
        if (match.winner) finish();
      }
      hudClock += dt;
      if (hudClock > 0.12) {
        updateHud();
        hudClock = 0;
      }
      if (noticeTime > 0) {
        noticeTime -= dt;
        if (noticeTime <= 0) $("announcement").textContent = "";
      }
    } else {
      tapped.clear();
      pendingFlaps.clear();
    }
    render(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
