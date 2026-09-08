/* Application composition, round lifecycle and fixed-step frame loop. */
(() => {
  "use strict";
  const deps = {};
  const state = {
    screen: "menu",
    seats: [null, null, null, null],
    mode: "ffa",
    match: null,
    series: null,
    resultsMode: "round",
    countdown: 0,
    endingTime: 0,
    clock: 0,
    last: 0,
    accumulator: 0,
    hudClock: 0,
    pressed: new Set(),
    tapped: new Set(),
    padPrevious: new Map(),
    padMove: new Map(),
    padFrames: new Map(),
    pendingFlaps: new Set(),
    pendingBoosts: new Set(),
    menuIndex: 0,
    particles: [],
    lastPadStatus: "",
    pausedForDisconnect: false,
    selectedMode: null,
    modeCursor: 0,
    botSerial: 0,
    mouseSlot: 0,
  };

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
  const { MatchSeries, rankPlayers } = OneBigSkySeries;
  const broadcast = new OneBigSkyBroadcast.Broadcast();
  const powerColor = {
    flame: "#ff9658",
    sawblade: "#d8e7ff",
    rocket: "#73eaff",
  };
  const STEP = 1 / 120;
  function resize() {
    const scale = Math.min(innerWidth / W, innerHeight / H);
    $("stage").style.transform = `scale(${scale})`;
    $("stage").style.left = `${(innerWidth - W * scale) / 2}px`;
    $("stage").style.top = `${(innerHeight - H * scale) / 2}px`;
  }
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
  function announce(text) {
    broadcast.say(text);
  }
  const playerName = (p) => `${birds[p.character].name} (P${p.slot + 1})`;
  function startMatch() {
    if (!deps.canStart()) return;
    state.series = new MatchSeries(
      state.seats
        .filter(Boolean)
        .map((s) => ({ ...s, slot: state.seats.indexOf(s) })),
      state.mode,
    );
    startRound();
  }
  function startRound() {
    audioUnlock();
    state.match = new Match(
      state.series.seats,
      state.series.mode,
      Math.random,
      arenaRotation.next(),
    );
    deps.buildBackground(state.match.arena);
    state.mode = state.series.mode;
    state.particles = [];
    broadcast.reset();
    $("commentary").textContent = "";
    state.countdown = 3;
    state.endingTime = 0;
    state.resultsMode = "round";
    deps.show("countdown");
    deps.updateHud();
    tone(300, 0.15);
  }
  function continueResults() {
    if (state.resultsMode === "match") startMatch();
    else if (state.series.winner) deps.showResults(true);
    else startRound();
  }
  function pause(reason = "The sky can wait.", disconnect = false) {
    if (!["match", "countdown", "ending"].includes(state.screen)) return;
    state.pausedForDisconnect = disconnect;
    $("pause-reason").textContent = reason;
    deps.show("pause");
  }
  function resume() {
    if (state.screen !== "pause") return;
    if (deps.missingControllers().length) {
      $("pause-reason").textContent =
        "Reconnect the missing controller, then press Start or Resume. You can also return to the lobby.";
      return;
    }
    state.pausedForDisconnect = false;
    audioUnlock();
    deps.show(
      state.endingTime > 0
        ? "ending"
        : state.countdown > 0
          ? "countdown"
          : "match",
    );
  }
  function finish() {
    state.endingTime = 0;
    state.series.recordRound(state.match);
    deps.showResults(false);
  }
  function frame(timestamp) {
    const dt = Math.min((timestamp - state.last) / 1000 || 0, 0.05);
    state.last = timestamp;
    state.clock += dt;
    deps.pollPads();
    if (state.screen === "countdown") {
      const before = Math.ceil(state.countdown);
      state.countdown -= dt;
      $("announcement").className = "countdown";
      $("announcement").textContent =
        state.countdown > 0.3 ? Math.ceil(state.countdown) : "FLY!";
      if (Math.ceil(state.countdown) !== before)
        tone(300 + (3 - Math.ceil(state.countdown)) * 100, 0.1);
      if (state.countdown <= 0) {
        state.countdown = 0;
        deps.show("match");
        broadcast.say("round", { r: state.series.rounds.length + 1 });
      }
      state.tapped.clear();
      state.pendingFlaps.clear();
      state.pendingBoosts.clear();
    } else if (state.screen === "match") {
      state.accumulator += dt;
      while (state.accumulator >= STEP && state.screen === "match") {
        state.match.step(
          STEP,
          state.match.players.map((p) => deps.inputFor(p, STEP)),
        );
        deps.processEvents();
        state.accumulator -= STEP;
        if (state.match.winner) {
          state.endingTime = 1.6;
          deps.show("ending");
          deps.updateHud();
        }
      }
      state.hudClock += dt;
      if (state.hudClock > 0.12) {
        deps.updateHud();
        state.hudClock = 0;
      }
    } else if (state.screen === "ending") {
      // Keep the final arena and feather particles visible before the overlay.
      // Combat is already settled, so only presentation time advances here.
      state.endingTime -= dt;
      state.tapped.clear();
      state.pendingFlaps.clear();
      state.pendingBoosts.clear();
      if (state.endingTime <= 0) finish();
    } else {
      state.tapped.clear();
      state.pendingFlaps.clear();
      state.pendingBoosts.clear();
    }
    if (["match", "ending"].includes(state.screen)) {
      const call = broadcast.step(dt);
      if ($("commentary").textContent !== call)
        $("commentary").innerHTML = deps.commentaryMarkup(call);
    }
    $("commentary").className = broadcast.current ? "" : "is-dimmed";
    $("announcer").className =
      ["match", "ending"].includes(state.screen) && broadcast.current
        ? "is-talking"
        : "";
    deps.render(dt);
    requestAnimationFrame(frame);
  }
  Object.assign(deps, {
    $,
    birds,
    tone,
    startMatch,
    TEAMS,
    audioUnlock,
    pause,
    resume,
    continueResults,
    sound,
    announce,
    startRound,
    gamepadState,
    edges,
    botInput,
    ctx,
    playerName,
    broadcast,
    powerColor,
    rankPlayers,
    W,
    H,
    ARENAS,
    PLATFORM_DEPTH,
  });
  const modules = {};
  // Wire every export before registering listeners or drawing the cached background.
  for (const moduleName of [
    "input",
    "portraits",
    "sprites",
    "background",
    "effects",
    "results",
    "menus",
    "renderer",
  ]) {
    const module = OneBigSkyUI[moduleName](state, deps);
    modules[moduleName] = module;
    for (const [name, value] of Object.entries(module)) {
      if (name !== "initialize") deps[name] = value;
    }
  }
  modules.input.initialize();
  modules.background.initialize();
  modules.menus.initialize();
  addEventListener("resize", resize);
  resize();
  updateSoundControl();
  addEventListener("pointerdown", (event) => {
    if (!event.target.closest?.("#sound, #sound-play, #pause-sound"))
      audioUnlock();
  });
  requestAnimationFrame(frame);
})();
