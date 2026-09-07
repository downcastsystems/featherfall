/* OneBigSky presentation and local input. */
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
  } = OneBigSky;
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
  const { MatchSeries, rankPlayers } = OneBigSkySeries;
  const broadcast = new OneBigSkyBroadcast.Broadcast();
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
    for (const id of ["menu", "lobby", "mode-screen", "pause", "results"])
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
  let selectedMode = null,
    modeCursor = 0,
    botSerial = 0,
    mouseSlot = 0;
  const allReady = () =>
    seats.filter(Boolean).length >= 2 &&
    seats.filter(Boolean).every((s) => s.ready);
  function balanceBots() {
    const counts = [0, 0];
    seats.forEach((s) => {
      if (s && s.kind !== "bot") counts[s.team]++;
    });
    seats.forEach((s) => {
      if (s?.kind === "bot") {
        s.team = counts[0] <= counts[1] ? 0 : 1;
        counts[s.team]++;
      }
    });
  }
  function randomBotCharacters() {
    const used = new Set(
      seats.filter((s) => s && s.kind !== "bot").map((s) => s.character),
    );
    seats.forEach((s) => {
      if (s?.kind !== "bot") return;
      if (used.has(s.character)) {
        const choices = birds.map((_, i) => i).filter((i) => !used.has(i));
        s.character = choices[Math.floor(Math.random() * choices.length)];
      }
      used.add(s.character);
    });
  }
  function removeBot() {
    const bots = seats.filter((s) => s?.kind === "bot");
    const last = bots.sort((a, b) => b.added - a.added)[0];
    if (last) seats[seats.indexOf(last)] = null;
    renderSeats();
  }
  function ready(slot) {
    if (!seats[slot] || seats[slot].kind === "bot") return;
    seats[slot].ready = !seats[slot].ready;
    renderSeats();
  }
  function lobbySelect(slot) {
    if (allReady()) {
      openMode();
      return;
    }
    if (seats[slot] && !seats[slot].ready) ready(slot);
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
    const used = new Set(seats.filter(Boolean).map((s) => s.character));
    const choices = birds.map((_, i) => i).filter((i) => !used.has(i));
    seats[slot] = {
      kind,
      source,
      character:
        kind === "bot"
          ? choices[Math.floor(Math.random() * choices.length)]
          : slot % birds.length,
      team: slot % 2,
      ready: kind === "bot",
      added: ++botSerial,
    };
    randomBotCharacters();
    tone(460, 0.1, "triangle", 0.05, 700);
    renderSeats();
  }
  const keyName = (code) =>
    code
      .replace("Key", "")
      .replace("Arrow", "")
      .replace("ShiftRight", "R.SHIFT")
      .toUpperCase();
  function rotate(slot, direction) {
    const s = seats[slot];
    if (!s || s.ready) return;
    const row = Math.floor(s.character / 4),
      col = s.character % 4;
    s.character =
      Math.abs(direction) === 4
        ? (1 - row) * 4 + col
        : s.kind === "keyboard"
          ? (s.character + direction + birds.length) % birds.length
          : row * 4 + ((col + direction + 4) % 4);
    randomBotCharacters();
    renderSeats();
  }
  function canStart() {
    return (
      allReady() &&
      selectedMode !== null &&
      (mode !== "teams" ||
        new Set(seats.filter(Boolean).map((s) => s.team)).size === 2)
    );
  }
  function openMode() {
    if (!allReady()) return;
    selectedMode = null;
    modeCursor = 0;
    show("mode-screen");
    renderMode();
  }
  function chooseMode(value) {
    selectedMode = mode = value;
    if (value === "teams") balanceBots();
    modeCursor = canStart() ? 2 : 1;
    renderMode();
  }
  function moveTeam(slot, direction) {
    if (mode !== "teams" || selectedMode !== "teams" || !seats[slot]) return;
    seats[slot].team = direction < 0 ? 0 : 1;
    balanceBots();
    modeCursor = canStart() ? 2 : 1;
    renderMode();
  }
  function selectMode() {
    if (modeCursor === 2) {
      if (canStart()) startMatch();
    } else chooseMode(modeCursor === 0 ? "ffa" : "teams");
  }
  function renderMode() {
    $("mode-ffa").setAttribute("aria-pressed", selectedMode === "ffa");
    $("mode-teams").setAttribute("aria-pressed", selectedMode === "teams");
    $("team-assign").hidden = selectedMode !== "teams";
    $("team-assign").innerHTML = TEAMS.map(
      (t, team) =>
        `<div class="team-column" style="--team:${t.color}"><h3>${t.name} TEAM</h3>${seats.map((s, i) => (s && s.team === team ? `<button data-team-slot="${i}" style="--bird:${birds[s.character].color}"><b>P${i + 1}</b> ${birds[s.character].name} ${s.kind === "bot" ? "· BOT" : ""}<span>↔</span></button>` : "")).join("")}</div>`,
    ).join("");
    $("fly").disabled = !canStart();
    $("mode-message").textContent =
      selectedMode === "teams"
        ? "LEFT / RIGHT TO CHANGE YOUR TEAM · B BACK"
        : selectedMode
          ? "READY FOR TAKEOFF"
          : "CHOOSE YOUR MATCH";
    const keyboardSeat = seats.find((s) => s?.kind === "keyboard");
    if (keyboardSeat) {
      const k = keys[keyboardSeat.source];
      $("mode-message").textContent =
        selectedMode === "teams"
          ? `${keyName(k.left)}/${keyName(k.right)} TEAM · ENTER TO FLY · ESC BACK`
          : `${keyName(k.dive)} NEXT OPTION · ${keyName(k.flap)} / ENTER SELECT · ESC BACK`;
      $("mode-back").textContent = "ESC · BACK";
    } else $("mode-back").textContent = "B · BACK";
    ["mode-ffa", "mode-teams", "fly"].forEach((id, i) =>
      $(id).setAttribute("data-pad-focus", modeCursor === i ? "SELECT" : ""),
    );
  }
  function drawPortrait(target, character) {
    const portrait = document.createElement("canvas");
    portrait.width = 80;
    portrait.height = 42;
    const g = portrait.getContext("2d"),
      b = birds[character];
    const ink = "#122232";
    const rect = (x, y, w, h, color) => {
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
    };
    const shape = (points, color) => {
      g.fillStyle = color;
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fill();
    };
    const eye = (x, y, w = 7, h = 8) => {
      rect(x, y, w, h, b.light);
      rect(x + w - 4, y + 1, 4, h - 1, ink);
      rect(x + w - 3, y + 1, 2, 2, "#ffffff");
    };
    // Each tile gets its own close-up head artwork, independent of the riding sprite.
    if (character === 0) {
      shape(
        [
          [20, 41],
          [23, 24],
          [19, 15],
          [25, 8],
          [39, 7],
          [48, 15],
          [59, 18],
          [64, 25],
          [61, 34],
          [45, 36],
          [40, 42],
        ],
        ink,
      );
      shape(
        [
          [23, 18],
          [18, 3],
          [28, 10],
          [33, 4],
          [36, 14],
        ],
        b.light,
      );
      shape(
        [
          [23, 39],
          [27, 25],
          [23, 16],
          [30, 11],
          [40, 11],
          [46, 18],
          [59, 21],
          [60, 29],
          [43, 33],
          [37, 42],
        ],
        b.color,
      );
      shape(
        [
          [24, 30],
          [29, 26],
          [34, 31],
          [45, 32],
          [40, 42],
          [22, 42],
        ],
        b.dark,
      );
      rect(42, 25, 18, 5, b.light);
      eye(35, 16);
      rect(34, 15, 10, 2, b.dark);
      rect(55, 21, 3, 2, ink);
      rect(45, 31, 13, 1, ink);
      rect(48, 31, 2, 3, b.light);
      shape(
        [
          [22, 21],
          [15, 15],
          [17, 27],
          [25, 28],
        ],
        b.dark,
      );
    } else if (character === 1) {
      shape(
        [
          [20, 42],
          [24, 24],
          [22, 12],
          [28, 7],
          [42, 6],
          [50, 15],
          [49, 23],
          [64, 24],
          [64, 33],
          [58, 32],
          [47, 30],
          [44, 42],
        ],
        ink,
      );
      shape(
        [
          [23, 40],
          [28, 24],
          [25, 13],
          [30, 9],
          [42, 9],
          [47, 17],
          [45, 30],
          [40, 42],
        ],
        b.color,
      );
      shape(
        [
          [26, 15],
          [19, 10],
          [29, 10],
          [26, 5],
          [38, 9],
        ],
        b.color,
      );
      shape(
        [
          [23, 40],
          [29, 27],
          [37, 30],
          [39, 42],
        ],
        b.dark,
      );
      shape(
        [
          [35, 24],
          [46, 24],
          [44, 38],
          [36, 42],
          [30, 37],
        ],
        b.light,
      );
      shape(
        [
          [47, 23],
          [63, 25],
          [63, 31],
          [60, 31],
          [59, 28],
          [47, 28],
        ],
        "#efbf69",
      );
      rect(48, 23, 13, 2, "#ffe3a0");
      eye(38, 16, 7, 8);
      rect(36, 14, 10, 2, b.dark);
    } else if (character === 2) {
      shape(
        [
          [18, 42],
          [21, 22],
          [29, 12],
          [29, 2],
          [36, 8],
          [43, 6],
          [47, 13],
          [46, 23],
          [58, 30],
          [57, 37],
          [44, 38],
          [40, 42],
        ],
        ink,
      );
      shape(
        [
          [20, 42],
          [20, 19],
          [28, 10],
          [34, 11],
          [29, 23],
          [29, 42],
        ],
        b.dark,
      );
      shape(
        [
          [29, 20],
          [32, 5],
          [36, 13],
          [43, 10],
          [44, 24],
          [55, 31],
          [54, 35],
          [41, 35],
          [37, 42],
          [28, 42],
        ],
        b.color,
      );
      shape(
        [
          [32, 9],
          [33, 4],
          [36, 11],
        ],
        b.light,
      );
      shape(
        [
          [39, 27],
          [46, 26],
          [56, 32],
          [54, 36],
          [43, 35],
        ],
        b.light,
      );
      rect(51, 31, 3, 2, ink);
      eye(36, 17, 6, 7);
      shape(
        [
          [25, 14],
          [19, 24],
          [24, 23],
          [18, 34],
          [24, 30],
          [21, 42],
          [29, 42],
          [31, 17],
        ],
        "#ded0ff",
      );
    } else if (character === 3) {
      shape(
        [
          [20, 42],
          [30, 25],
          [16, 4],
          [36, 9],
          [45, 17],
          [65, 25],
          [67, 29],
          [45, 32],
          [42, 42],
        ],
        ink,
      );
      shape(
        [
          [21, 8],
          [35, 12],
          [42, 19],
          [33, 23],
        ],
        b.dark,
      );
      shape(
        [
          [26, 42],
          [33, 25],
          [29, 17],
          [36, 13],
          [43, 20],
          [61, 26],
          [44, 28],
          [38, 42],
        ],
        b.color,
      );
      shape(
        [
          [40, 22],
          [65, 27],
          [44, 29],
        ],
        b.light,
      );
      rect(46, 28, 16, 1, b.dark);
      eye(35, 17, 6, 7);
      shape(
        [
          [32, 29],
          [40, 29],
          [37, 42],
          [29, 42],
        ],
        b.light,
      );
    } else if (character === 4) {
      shape(
        [
          [23, 42],
          [20, 25],
          [21, 14],
          [24, 3],
          [33, 3],
          [36, 11],
          [44, 10],
          [49, 3],
          [55, 5],
          [56, 17],
          [60, 26],
          [54, 35],
          [48, 42],
        ],
        ink,
      );
      shape(
        [
          [25, 41],
          [23, 25],
          [26, 15],
          [26, 6],
          [31, 6],
          [34, 16],
          [45, 14],
          [50, 7],
          [53, 8],
          [52, 21],
          [57, 27],
          [50, 33],
          [45, 42],
        ],
        b.color,
      );
      rect(27, 8, 3, 7, "#c77f7a");
      rect(49, 10, 3, 7, "#c77f7a");
      shape(
        [
          [28, 29],
          [35, 25],
          [44, 27],
          [52, 25],
          [55, 29],
          [48, 36],
          [42, 42],
          [32, 39],
        ],
        b.light,
      );
      eye(30, 19, 8, 9);
      eye(45, 18, 7, 9);
      rect(39, 28, 6, 4, ink);
      rect(40, 32, 2, 3, b.dark);
      rect(38, 35, 7, 1, b.dark);
      rect(39, 36, 4, 3, "#fff9e4");
      rect(23, 30, 7, 1, b.dark);
      rect(52, 30, 7, 1, b.dark);
    } else if (character === 5) {
      rect(29, 3, 3, 14, "#a49161");
      rect(25, 2, 6, 4, b.color);
      rect(46, 2, 3, 15, "#a49161");
      rect(47, 1, 6, 4, b.color);
      shape(
        [
          [23, 22],
          [28, 13],
          [45, 12],
          [55, 19],
          [58, 30],
          [51, 38],
          [39, 42],
          [26, 37],
          [21, 30],
        ],
        ink,
      );
      shape(
        [
          [26, 22],
          [30, 16],
          [44, 15],
          [52, 21],
          [55, 29],
          [49, 35],
          [38, 39],
          [28, 34],
          [24, 29],
        ],
        b.color,
      );
      rect(28, 19, 8, 14, b.dark);
      rect(43, 18, 9, 14, b.dark);
      rect(29, 21, 3, 5, b.light);
      rect(44, 20, 3, 5, b.light);
      rect(36, 32, 9, 2, ink);
      rect(39, 34, 5, 2, b.light);
      shape(
        [
          [23, 33],
          [27, 37],
          [26, 41],
          [34, 39],
          [40, 42],
          [47, 38],
          [52, 39],
          [51, 34],
          [42, 37],
          [32, 36],
        ],
        b.light,
      );
    } else if (character === 6) {
      shape(
        [
          [27, 18],
          [23, 5],
          [18, 2],
          [21, 2],
          [28, 8],
          [31, 17],
        ],
        b.dark,
      );
      shape(
        [
          [46, 17],
          [51, 6],
          [59, 2],
          [54, 2],
          [48, 6],
          [43, 17],
        ],
        b.dark,
      );
      for (let i = 0; i < 4; i++) {
        rect(20 + i * 2, 4 + i * 3, 7, 1, b.light);
        rect(48 + i * 2, 11 - i * 3, 8, 1, b.light);
      }
      shape(
        [
          [21, 23],
          [24, 16],
          [30, 16],
          [32, 12],
          [39, 15],
          [45, 13],
          [49, 17],
          [55, 17],
          [57, 25],
          [54, 32],
          [58, 37],
          [49, 37],
          [45, 42],
          [38, 39],
          [31, 42],
          [28, 37],
          [20, 36],
          [24, 30],
        ],
        b.dark,
      );
      shape(
        [
          [24, 24],
          [27, 18],
          [33, 18],
          [34, 15],
          [40, 18],
          [45, 16],
          [49, 21],
          [53, 20],
          [54, 27],
          [50, 33],
          [53, 35],
          [46, 35],
          [43, 39],
          [38, 37],
          [32, 39],
          [30, 34],
          [24, 34],
          [27, 29],
        ],
        b.light,
      );
      rect(28, 22, 8, 10, ink);
      rect(43, 21, 8, 10, ink);
      rect(29, 23, 3, 3, "#ffffff");
      rect(44, 22, 3, 3, "#ffffff");
      rect(37, 31, 5, 2, b.dark);
      rect(36, 34, 7, 1, b.dark);
    } else {
      shape(
        [
          [18, 25],
          [22, 15],
          [33, 11],
          [38, 3],
          [43, 10],
          [50, 7],
          [50, 14],
          [58, 20],
          [63, 27],
          [58, 34],
          [45, 39],
          [30, 39],
          [22, 34],
        ],
        ink,
      );
      shape(
        [
          [22, 25],
          [26, 18],
          [35, 15],
          [40, 7],
          [42, 15],
          [47, 12],
          [47, 18],
          [55, 22],
          [59, 27],
          [55, 31],
          [44, 35],
          [30, 35],
          [24, 31],
        ],
        b.color,
      );
      shape(
        [
          [24, 30],
          [35, 31],
          [43, 28],
          [58, 28],
          [55, 33],
          [44, 37],
          [30, 36],
        ],
        b.light,
      );
      shape(
        [
          [26, 28],
          [16, 21],
          [19, 33],
          [29, 34],
        ],
        b.dark,
      );
      eye(43, 19, 9, 9);
      rect(57, 28, 6, 2, b.dark);
      rect(57, 31, 4, 2, b.dark);
      rect(35, 23, 2, 7, b.dark);
      rect(32, 25, 2, 6, b.dark);
      rect(28, 18, 8, 2, "#a8e4ff");
    }
    target.clearRect(0, 0, 320, 168);
    target.imageSmoothingEnabled = false;
    target.drawImage(portrait, 0, 0, 320, 168);
  }
  function renderSeats() {
    $("seats").innerHTML = seats
      .map((s, i) =>
        s
          ? `<article class="rider-preview ${s.ready ? "is-ready" : ""}" style="--bird:${birds[s.character].color}"><div>P${i + 1} ${s.kind === "bot" ? "· BOT" : ""}</div><canvas id="preview-${i}" width="240" height="112"></canvas><b>${birds[s.character].name}</b><button data-action="ready" data-seat="${i}" ${s.kind === "bot" ? "disabled" : ""}>${s.ready ? "✓ READY" : `${s.kind === "keyboard" ? keyName(keys[s.source].flap) : "A"} · READY`}</button></article>`
          : `<article class="rider-preview empty"><div>P${i + 1}</div><button data-action="join" data-seat="${i}" data-source="${i}">A / START<br>TO JOIN · KEY ${i + 1}</button></article>`,
      )
      .join("");
    $("roster").innerHTML = birds
      .map(
        (b, character) =>
          `<button class="roster-tile" data-character="${character}" style="--bird:${b.color}" aria-label="${b.name}, ${b.bird}"><div class="roster-markers">${seats.map((s, i) => (s?.character === character ? `<span class="${s.ready ? "locked" : ""}" style="--marker:${["#ff9064", "#77e8ba", "#b9a1ff", "#f8d66d"][i]}">${i + 1}${s.ready ? "✓" : ""}</span>` : "")).join("")}</div><canvas id="mount-${character}" width="320" height="168"></canvas><strong>${b.name}</strong><small>${b.bird}</small></button>`,
      )
      .join("");
    seats.forEach((s, i) => {
      if (s)
        drawBird(
          $("preview-" + i).getContext("2d"),
          120,
          70,
          s.character,
          1,
          false,
          true,
          2.8,
          clock,
        );
    });
    birds.forEach((b, i) => drawPortrait($("mount-" + i).getContext("2d"), i));
    $("add-bot").disabled = seats.every(Boolean);
    $("remove-bot").disabled = !seats.some((s) => s?.kind === "bot");
    $("launch").disabled = !allReady();
    $("launch").setAttribute("data-pad-focus", allReady() ? "SELECT" : "");
    $("lobby-message").textContent = allReady()
      ? "EVERYONE'S READY · A / START TO CONTINUE"
      : "A LOCK IN · B UNREADY · X ADD BOT · Y REMOVE BOT";
    const keyboardSeat = seats.find((s) => s?.kind === "keyboard");
    if (keyboardSeat) {
      const k = keys[keyboardSeat.source];
      $("lobby-message").textContent = allReady()
        ? "EVERYONE’S READY · ENTER TO CONTINUE · + / − BOTS"
        : `${keyName(k.left)}/${keyName(k.right)} PICK · ${keyName(k.flap)} READY · ${keyName(k.boost)} UNREADY · + / − BOTS`;
    }
    if (allReady()) $("launch").focus();
  }
  $("seats").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const i = Number(b.dataset.seat);
    if (b.dataset.action === "join")
      join("keyboard", Number(b.dataset.source), i);
    if (b.dataset.action === "ready") {
      mouseSlot = i;
      ready(i);
    }
  });
  $("roster").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    let slot =
      seats[mouseSlot]?.kind !== "bot" &&
      seats[mouseSlot] &&
      !seats[mouseSlot].ready
        ? mouseSlot
        : seats.findIndex((s) => s && s.kind !== "bot" && !s.ready);
    if (slot < 0) return;
    seats[slot].character = Number(b.dataset.character);
    randomBotCharacters();
    renderSeats();
  });
  $("team-assign").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const i = Number(b.dataset.teamSlot);
    if (seats[i]?.kind === "bot") return;
    moveTeam(i, seats[i].team === 0 ? 1 : -1);
  });
  $("mode-ffa").onclick = () => chooseMode("ffa");
  $("mode-teams").onclick = () => chooseMode("teams");
  $("fly").onclick = () => {
    if (canStart()) startMatch();
  };
  $("mode-back").onclick = () => show("lobby");
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
  $("add-bot").onclick = () => join("bot", Date.now());
  $("remove-bot").onclick = removeBot;
  $("launch").onclick = openMode;
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
        "Equal",
        "Minus",
        "NumpadAdd",
        "NumpadSubtract",
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
      if (screen === "lobby") openMode();
      else if (screen === "mode-screen") selectMode();
      else selectMenu();
    } else if (e.code === "Escape") {
      if (["match", "countdown", "ending"].includes(screen)) pause();
      else if (screen === "pause") resume();
      else if (screen === "lobby") show("menu");
      else if (screen === "mode-screen") show("lobby");
      else if (screen === "results") show("lobby");
    } else if (screen === "lobby") {
      if (["Equal", "NumpadAdd"].includes(e.code)) {
        join("bot", null);
        return;
      }
      if (["Minus", "NumpadSubtract"].includes(e.code)) {
        removeBot();
        return;
      }
      const source = keys.findIndex((k) =>
        [k.left, k.right, k.flap, k.dive].includes(e.code),
      );
      if (
        source >= 0 &&
        !seats.some((s) => s?.kind === "keyboard" && s.source === source)
      ) {
        join(
          "keyboard",
          source,
          seats[source] ? seats.findIndex((s) => !s) : source,
        );
        return;
      }
      if (/^Digit[1-4]$/.test(e.code)) {
        const k = Number(e.code.slice(-1)) - 1;
        const slot = seats[k] ? seats.findIndex((s) => !s) : k;
        join("keyboard", k, slot);
      }
      seats.forEach((s, i) => {
        if (s?.kind === "keyboard") {
          if (e.code === keys[s.source].left) rotate(i, -1);
          if (e.code === keys[s.source].right) rotate(i, 1);
          if (e.code === keys[s.source].dive) rotate(i, 4);
          if (e.code === keys[s.source].flap) {
            if (allReady()) openMode();
            else if (!s.ready) ready(i);
          }
          if (e.code === keys[s.source].boost) {
            s.ready = false;
            renderSeats();
          }
        }
      });
    } else if (screen === "mode-screen") {
      const playerAction = seats.some(
        (s) =>
          s?.kind === "keyboard" &&
          [keys[s.source].flap, keys[s.source].dive].includes(e.code),
      );
      if (!playerAction && (e.code === "ArrowUp" || e.code === "ArrowDown")) {
        modeCursor = (modeCursor + (e.code === "ArrowUp" ? 2 : 1)) % 3;
        renderMode();
      }
      seats.forEach((s, i) => {
        if (s?.kind !== "keyboard") return;
        if (e.code === keys[s.source].boost) show("lobby");
        else if (e.code === keys[s.source].left) moveTeam(i, -1);
        else if (e.code === keys[s.source].right) moveTeam(i, 1);
        else if (e.code === keys[s.source].flap) selectMode();
        else if (e.code === keys[s.source].dive) {
          modeCursor = (modeCursor + 1) % 3;
          renderMode();
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
        const slot = seats.findIndex(
          (s) => s?.kind === "pad" && s.source === pad.index,
        );
        if (edge.team) {
          join("bot", Date.now());
          continue;
        }
        if (edge.mode || edge.removeBot) {
          removeBot();
          continue;
        }
        if (slot < 0) {
          if (edge.start || edge.flap) join("pad", pad.index);
          else if (edge.back) show("menu");
          continue;
        }
        if (edge.back) {
          if (seats[slot].ready) seats[slot].ready = false;
          else seats[slot] = null;
          renderSeats();
          continue;
        }
        if (moveEdge) rotate(slot, dir);
        if (edge.up || edge.down) rotate(slot, 4);
        if (edge.start) openMode();
        else if (edge.flap) lobbySelect(slot);
      } else if (screen === "mode-screen") {
        const slot = seats.findIndex(
          (s) => s?.kind === "pad" && s.source === pad.index,
        );
        if (slot < 0) continue;
        if (edge.back) {
          show("lobby");
          continue;
        }
        if (edge.up || edge.down) {
          modeCursor = (modeCursor + (edge.up ? 2 : 1)) % 3;
          renderMode();
        }
        if (moveEdge) moveTeam(slot, dir);
        if (edge.start && canStart()) startMatch();
        else if (edge.flap) selectMode();
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
    if (screen === "lobby" || screen === "mode-screen") {
      let changed = false;
      seats.forEach((s, i) => {
        if (s?.kind === "pad" && !pads.some((p) => p.index === s.source)) {
          seats[i] = null;
          changed = true;
        }
      });
      if (changed) {
        if (screen === "mode-screen") show("lobby");
        else renderSeats();
      }
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
  function commentaryMarkup(text) {
    const escape = (value) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const names = (match?.players || []).map((p) => ({
      name: playerName(p),
      color: birds[p.character].color,
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
  function processEvents() {
    for (const event of match.events) {
      const color =
        event.id !== undefined
          ? birds[match.players[event.id].character].color
          : "#ffe9b4";
      if (event.type === "saw-clang") {
        burst(event.x, event.y, "#ffe4a0", 10, 0.35);
        tone(180, 0.08, "square", 0.035, 60);
      }
      if (event.type === "piranha-pop") {
        burst(event.x, event.y, "#ffad62", 14, 0.6);
        burst(event.x, event.y, "#9be1d3", 8, 0.4);
        sound.play("zombie-pop", 0);
      }
      if (event.type === "splash") {
        burst(event.x, event.y, "#9be1d3", 12, 0.4);
        sound.play("splash");
      }
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
      if (event.type === "snow-pop") {
        burst(event.x, event.y, "#e5f8ff", 22, 0.8);
        sound.play("zombie-pop", 0);
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
            event.cause === "factory"
              ? `${playerName(victim)} ignored the safety briefing. There was a saw.`
              : event.cause === "snowball"
                ? `${playerName(victim)} lost a snowball fight. Against the entire snowball.`
                : event.cause === "zombie"
                  ? `${playerName(victim)} ${event.eliminated ? "is out. Outplayed by the dearly departed." : "loses a life to a zombie. Brains were clearly on the menu."}`
                  : event.cause === "water"
                    ? `${playerName(victim)} went swimming. Bold choice. Terrible result.`
                    : event.cause === "piranha"
                      ? `${playerName(victim)} is on the lunch menu. Finally, some recognition.`
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
    rider = true,
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
        r(-1, -28, 2, 5, "#e6dfcb");
        r(-2, -24, 4, 4, b.dark);
        r(-4, -11, 10, 20, b.color);
        r(-4, -7, 10, 4, b.dark);
        r(-4, 1, 10, 4, b.dark);
        r(-10 + tuck, -18, 5, 16, "#edf0dc");
        r(7 - tuck, -17, 5, 16, "#bdcbd5");
        r(-3, 8, 9, 9, b.color);
        r(2, 11, 2, 2, b.dark);
        r(-4, 15, 2, 7, b.dark);
        r(5, 15, 2, 7, b.dark);
      } else if (b.mount === "fish") {
        r(-7, -26, 5, 7, b.color);
        r(3, -26, 5, 7, b.color);
        r(-9, -14, 5, 18, b.dark);
        r(6, -14, 5, 18, b.light);
        r(-4, 1, 10, 14, b.color);
        r(-2, 10, 7, 8, b.light);
        r(2, 7, 3, 4, "#162c48");
        r(3, 7, 1, 1, "#fff");
        r(-2, 17, 5, 2, b.dark);
      } else if (b.mount === "moth") {
        // Fold the patterned lobes upward for the dive.
        for (const side of [-1, 1]) {
          const wx = side < 0 ? -13 + tuck : 6 - tuck;
          r(wx, -23, 7, 25, "#777f96");
          r(wx + 1, -21, 5, 25, "#c6bbc0");
          r(wx + 2, -18, 4, 24, "#f4efdf");
          r(wx + 2, -11, 4, 6, "#777f96");
          r(wx + 3, -10, 2, 4, "#d7c4a9");
          r(wx + 3, -9, 1, 2, "#45556d");
        }
        r(-4, 3, 12, 11, b.light);
        r(-2, 12, 8, 4, b.light);
        r(1, 7, 5, 5, "#303748");
        r(2, 7, 1, 1, "#fffaf0");
        for (const ax of [-3, 6]) {
          r(ax, 14, 1, 9, b.dark);
          r(ax - 2, 17, 5, 1, b.color);
          r(ax - 2, 20, 5, 1, b.light);
          r(ax - 1, 22, 3, 1, b.color);
        }
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
      if (rider) {
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
      }
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
      r(-18, -1, 5, 4, b.dark);
      r(-21, 0, 3, 2, "#e6dfcb");
      r(-23, 0, 2, 1, "#e6dfcb");
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
    } else if (b.mount === "fish") {
      // Forked tail, silver belly and long translucent pectoral fins.
      r(-23, -10, 5, 8, b.color);
      r(-23, 5, 5, 8, b.color);
      r(-20, -6, 5, 15, b.dark);
      r(-16, -4, 28, 12, b.dark);
      r(-12, -7, 27, 15, b.color);
      r(-10, 4, 24, 5, b.light);
      r(10, -5, 10, 10, b.color);
      r(18, 0, 3, 3, b.light);
      r(12, -4, 4, 4, "#172c48");
      r(13, -4, 1, 1, "#fff");
      r(7, -2, 1, 7, b.dark);
      r(-4, -12, 9, 5, b.dark);
      r(-1, -14, 4, 3, b.color);
      r(-16, flap ? -17 : 1, 13, flap ? 14 : 7, "#a9dfed");
      r(-20, flap ? -20 : 6, 10, 5, "#d8f3ff");
      r(-14, flap ? -13 : 5, 13, 2, "#5ca5cc");
      r(1, 7, 8, 3, b.dark);
    } else if (b.mount === "moth") {
      // The upper wing pair keeps its broad patterned silhouette.
      const lift = grounded ? -2 : flap ? -11 : 3;
      const wingLobe = (x, y, mirror) => {
        const rows = [
          [4, 0, 9, 2],
          [1, 2, 16, 3],
          [0, 5, 20, 4],
          [1, 9, 21, 4],
          [3, 13, 19, 4],
          [6, 17, 15, 4],
          [10, 21, 10, 3],
        ];
        const wr = (a, d, w, h, color) =>
          r(x + (mirror ? -a - w : a), y + d, w, h, color);
        for (const [a, d, w, h] of rows) wr(a, d, w, h, "#777f96");
        for (const [a, d, w, h] of rows.slice(1, -1))
          wr(a + 2, d, w - 4, h, "#c6bbc0");
        for (const [a, d, w, h] of rows.slice(2, -1))
          wr(a + 4, d, w - 8, h, "#f4efdf");
        wr(8, 8, 7, 7, "#777f96");
        wr(9, 9, 5, 5, "#d7c4a9");
        wr(10, 10, 3, 3, "#45556d");
        wr(10, 10, 1, 1, "#fff8e4");
        wr(15, 18, 3, 2, "#a9a4b4");
      };
      wingLobe(15, -17 + lift, true);
      wingLobe(-31, -17 + lift, false);
      // Soft segmented abdomen and a fluffy collar around a large dark eye.
      r(-12, -2, 20, 10, b.color);
      r(-15, 0, 5, 6, b.dark);
      r(-10, 5, 16, 4, b.light);
      r(-12, 0, 2, 6, "#a5a7b3");
      r(-7, 1, 2, 7, "#b9bac4");
      r(-2, 2, 2, 6, "#b9bac4");
      r(3, -9, 12, 16, b.light);
      r(1, -5, 3, 10, b.color);
      r(5, 6, 3, 3, b.color);
      r(10, 5, 3, 3, b.light);
      r(7, -14, 12, 15, b.light);
      r(5, -11, 16, 9, b.light);
      r(12, -11, 6, 7, "#303748");
      r(13, -11, 2, 2, "#fffaf0");
      r(18, -4, 3, 2, b.color);
      // Branched antennae, slanting out from the fuzzy forehead.
      for (const [ax, ay] of [
        [8, -15],
        [17, -16],
      ]) {
        r(ax, ay - 6, 1, 8, b.dark);
        r(ax - 2, ay - 7, 2, 2, b.color);
        r(ax - 3, ay - 5, 3, 1, b.light);
        r(ax + 1, ay - 4, 3, 1, b.color);
        r(ax - 2, ay - 2, 2, 1, b.light);
      }
      // Three visible jointed insect legs, dangling slightly during flight.
      for (const [lx, offset] of [
        [-7, walk],
        [1, -walk],
        [9, walk],
      ]) {
        const knee = grounded ? offset : 1;
        r(lx, 8, 2, 3, b.dark);
        r(lx - 2, 10, 3, 2, b.dark);
        r(lx - 2, 11, 1, 2 + knee, b.dark);
        r(lx - 2, 12 + knee, 3, 1, b.color);
      }
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
    if (rider) {
      r(-5, -15, 8, 9, "#273447");
      r(-4, -19, 7, 6, "#eddbc2");
      r(-6, -21, 10, 4, b.color);
      r(-6, -18, 3, 4, b.dark);
      r(1, -18, 2, 2, "#121e2a");
      r(-4, -12, 6, 5, b.light);
      r(-2, -7, 7, 3, "#263447");
      r(-10, -14, 6, 3, b.color);
      r(-14, -13, 5, 3, b.dark);
    }
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
    if (arena.motif === "factory") {
      for (const x of [80, 380, 680, 980, 1280, 1580, 1880]) {
        g.fillStyle = "#91a1a112";
        g.fillRect(x, 130, 12, 880);
        g.fillStyle = "#101c2633";
        g.fillRect(x - 65, 240, 140, 170);
        for (let row = 0; row < 3; row++)
          for (let col = 0; col < 3; col++) {
            g.fillStyle = "#e4b96112";
            g.fillRect(x - 55 + col * 43, 250 + row * 52, 34, 42);
          }
      }
      for (const y of [440, 670, 920]) {
        g.fillStyle = "#a7b3a615";
        g.fillRect(0, y, W, 12);
        g.fillStyle = "#15252c44";
        g.fillRect(0, y + 12, W, 5);
      }
    } else if (arena.motif === "sun") {
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
    } else if (arena.motif === "swamp") {
      for (const x of [70, 350, 1470, 1750]) {
        g.fillStyle = "#193e3f88";
        g.fillRect(x, 390, 32, 620);
        for (let j = 0; j < 5; j++) {
          g.fillStyle = j % 2 ? "#3a625b80" : "#234b4680";
          g.fillRect(x - 95 + j * 19, 370 + j * 28, 190 - j * 18, 45);
          g.fillStyle = "#73937955";
          g.fillRect(x - 65 + j * 35, 450 + j * 13, 5, 130 + j * 16);
        }
      }
      g.fillStyle = "#adc6a820";
      g.fillRect(0, 885, W, 30);
      g.fillRect(0, 950, W, 18);
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
    ].forEach((p) => {
      if (!["ice", "factory"].includes(arena.motif))
        pixelCloud(bg, ...p, "#8db9b30b");
    });
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
      if (!p.ground && arena.motif !== "factory")
        for (let j = 0; j < 3; j++) {
          const vx = x + 25 + rand() * (w - 50),
            len = 25 + rand() * 65;
          bg.fillStyle =
            arena.id === "hollow" ? "#4e6e64" : arena.accent + "70";
          bg.fillRect(Math.floor(vx / 2) * 2, y + 20, 2, len);
          for (let k = 8; k < len; k += 13)
            bg.fillRect(vx + (k % 2 ? -3 : 1), y + 20 + k, 4, 2);
        }
      if (!p.ground && arena.motif !== "factory") {
        bg.fillStyle = arena.accent;
        for (let j = 0; j < 4; j++) {
          const gx = x + 20 + rand() * (w - 40);
          bg.fillRect(gx, y - 5, 2, 5);
          bg.fillRect(gx - 3, y - 3, 8, 2);
        }
      }
    }
    if (arena.motif === "factory") {
      for (const p of arena.platforms) {
        bg.fillStyle = "#26353e";
        bg.fillRect(p.x, p.y + 3, p.w, 32);
        bg.fillStyle = "#7c8b8b";
        bg.fillRect(p.x, p.y, p.w, 5);
        for (let x = p.x + 6; x < p.x + p.w - 10; x += 24) {
          bg.fillStyle = "#e3b955";
          bg.fillRect(x, p.y + 6, 12, 8);
          bg.fillStyle = "#98a5a5";
          bg.fillRect(x + 3, p.y + 24, 3, 3);
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
      for (const saw of match.arena.saws || []) {
        ctx.fillStyle = "#29343e";
        ctx.fillRect(saw.x - 10, 100, 20, saw.y - 100);
        ctx.fillStyle = "#9daaaa";
        ctx.fillRect(saw.x - 3, 104, 6, saw.y - 104);
        drawSaw(saw.x, saw.y, match.time * 7, saw.radius);
        ctx.fillStyle = "#e3b955";
        ctx.fillRect(saw.x - 4, saw.y - 4, 8, 8);
      }
      for (const y of match.yetis) {
        const rise = Math.min(1, y.age / 0.14, (2.3 - y.age) / 0.65);
        ctx.save();
        ctx.beginPath();
        ctx.rect(y.x - 65, y.y - 65, 130, 65);
        ctx.clip();
        ctx.translate(
          Math.round(y.x),
          Math.round(
            y.y +
              (1 - rise) * 34 -
              (y.age < 0.35 ? Math.sin((y.age / 0.35) * Math.PI) * 7 : 0),
          ),
        );
        ctx.scale(y.direction, 1);
        // Small shaggy head, narrow body and skinny arms for the shove.
        ctx.fillStyle = "#b4d5e4";
        ctx.fillRect(-8, -22, 16, 19);
        ctx.fillStyle = "#edfaff";
        ctx.fillRect(-10, -30, 20, 15);
        ctx.fillRect(-7, -33, 3, 5);
        ctx.fillRect(5, -33, 3, 5);
        ctx.fillRect(-6, -18, 13, 14);
        ctx.fillRect(-9, -4, 7, 4);
        ctx.fillRect(4, -4, 7, 4);
        ctx.fillRect(-12, -19, 4, 11);
        ctx.fillStyle = "#6b9eb9";
        ctx.fillRect(-3, -27, 13, 9);
        ctx.fillStyle = "#152e49";
        ctx.fillRect(-1, -25, 2, 3);
        ctx.fillRect(6, -25, 2, 3);
        ctx.fillRect(2, -20, 5, 2);
        ctx.fillStyle = "#edfaff";
        ctx.fillRect(6, -16, y.pushed ? 15 : 8, 4);
        ctx.restore();
        ctx.fillStyle = "#e4f8ff";
        ctx.fillRect(y.x - 15, y.y - 2, 30, 2);
      }
      for (const b of match.snowballs) {
        for (const offset of [
          0,
          ...(b.x < 28 ? [W] : b.x > W - 28 ? [-W] : []),
        ]) {
          ctx.save();
          ctx.translate(Math.round(b.x + offset), Math.round(b.y));
          // Two-pixel rows trace a circle instead of broad octagonal corners.
          for (let row = -25; row < 25; row += 2) {
            const half = Math.round(Math.sqrt(625 - (row + 1) ** 2));
            ctx.fillStyle = "#9bbfd5";
            ctx.fillRect(-half, row, half * 2, 2);
            const innerY = row + 4;
            if (Math.abs(innerY) < 21) {
              const light = Math.round(Math.sqrt(441 - innerY ** 2));
              ctx.fillStyle = "#edfaff";
              ctx.fillRect(
                Math.max(-half, -light - 3),
                row,
                Math.min(light * 2, half * 2 - 3),
                2,
              );
            }
          }
          ctx.rotate(b.angle);
          ctx.fillStyle = "#c0dfed";
          ctx.fillRect(-11, -15, 8, 5);
          ctx.fillRect(8, 7, 6, 8);
          ctx.restore();
        }
      }
      if (match.arena.waterY !== undefined) {
        const y = match.arena.waterY;
        ctx.fillStyle = "#245d65";
        ctx.fillRect(210, y, W - 420, H - y);
        ctx.fillStyle = "#8dc9b5";
        ctx.fillRect(210, y, W - 420, 3);
        for (let i = 0; i < 20; i++) {
          ctx.fillStyle = "#6faea277";
          ctx.fillRect(
            230 + i * 75 + Math.sin(match.time * 2 + i) * 8,
            y + 10 + (i % 3) * 12,
            30,
            2,
          );
        }
        for (const f of match.piranhas) {
          if (f.warning > 0) {
            ctx.strokeStyle = "#dfedb0";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(
              f.x,
              y - 2,
              12 + Math.max(0, 1 - f.warning / 0.3) * 16,
              3,
              0,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
            continue;
          }
          ctx.save();
          ctx.translate(Math.round(f.x), Math.round(f.y));
          if (f.vy > 0) ctx.rotate(Math.PI);
          ctx.fillStyle = "#315248";
          ctx.fillRect(-9, -11, 18, 22);
          ctx.fillStyle = "#9cc071";
          ctx.fillRect(-7, -13, 14, 18);
          ctx.fillStyle = "#d37c59";
          ctx.fillRect(-5, -14, 10, 6);
          ctx.fillStyle = "#fff1c9";
          ctx.fillRect(-5, -15, 3, 4);
          ctx.fillRect(2, -15, 3, 4);
          ctx.fillStyle = "#132f35";
          ctx.fillRect(-5, -5, 3, 3);
          ctx.fillRect(3, -5, 3, 3);
          ctx.fillStyle = "#769857";
          ctx.fillRect(-7, 10, 5, 7);
          ctx.fillRect(2, 10, 5, 7);
          ctx.restore();
        }
      }
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
        $("commentary").innerHTML = commentaryMarkup(call);
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
