// Execute the real presentation/input code against a minimal DOM and canvas fixture.
// This tests input timing and screen transitions without requiring browser installs.

const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const Engine = require("../engine.js");
function fixture(options = {}) {
  const elements = new Map(),
    listeners = new Map();
  let frame,
    stamp = 1000,
    pads = [],
    latest;
  const trace = require("node:crypto").createHash("sha256");
  const record = (value) => {
    if (options.trace)
      trace.update(
        JSON.stringify(value, (key, v) =>
          typeof v === "function"
            ? undefined
            : key === "id" && /^canvas\d+$/.test(v)
              ? "canvas"
              : v,
        ) + "\n",
      );
  };
  const context = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    },
    {
      get: (o, k) => o[k] || ((...args) => record([k, ...args])),
      set: (o, k, value) => {
        record([k, value]);
        o[k] = value;
        return true;
      },
    },
  );
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        id,
        hidden: ["lobby", "mode-screen", "hud", "pause", "results"].includes(
          id,
        ),
        style: {},
        textContent: "",
        _html: "",
        get innerHTML() {
          return this._html;
        },
        set innerHTML(value) {
          this._html = value;
          if (this.id === "commentary")
            this.textContent = value.replace(/<[^>]*>/g, "");
        },
        disabled: false,
        focus() {},
        attributes: {},
        setAttribute(key, value) {
          this.attributes[key] = value;
        },
        getContext: () => context,
        addEventListener(type, fn) {
          this[type] = fn;
        },
        click() {
          this.onclick?.();
        },
      });
    return elements.get(id);
  };
  const document = {
    getElementById: element,
    createElement: () => element("canvas" + elements.size),
    documentElement: element("html"),
    body: { classList: { toggle() {} } },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
  };
  class Match extends Engine.Match {
    constructor(...args) {
      super(...args);
      latest = this;
    }
  }
  const soundEvents = [];
  const soundCalls = [];
  class RecordedAudio extends require("../audio.js") {
    play(kind, variant) {
      soundEvents.push(kind);
      soundCalls.push({ kind, variant });
      super.play(kind, variant);
    }
  }
  const sandbox = {
    OneBigSky: {
      ...Engine,
      Match,
      ArenaRotation: class extends Engine.ArenaRotation {
        constructor() {
          super(() => 0.999);
        }
      },
    },
    OneBigSkySeries: require("../match-series.js"),
    OneBigSkyBroadcast: require("../broadcast.js"),
    ArcadeAudio: RecordedAudio,
    document,
    window: {},
    innerWidth: 1280,
    innerHeight: 720,
    navigator: { getGamepads: () => pads },
    requestAnimationFrame: (fn) => (frame = fn),
    addEventListener: (type, fn) => listeners.set(type, fn),
    console,
    ...(options.math ? { Math: options.math } : {}),
  };
  vm.createContext(sandbox);
  const scripts = [
    ...fs
      .readFileSync(path.join(__dirname, "../index.html"), "utf8")
      .matchAll(/<script src="([^"]+)"/g),
  ]
    .map((m) => m[1])
    .filter((file) => file.startsWith("ui/") || file === "game.js");
  if (options.legacy) scripts.splice(0, scripts.length, options.legacy);
  for (const file of scripts)
    vm.runInContext(
      fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"),
      sandbox,
      { filename: file },
    );
  function advance(seconds = 1 / 60) {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) {
      stamp += 1000 / 60;
      frame(stamp);
    }
  }
  function key(code, repeat = false) {
    listeners.get("keydown")({ code, repeat, preventDefault() {} });
  }
  function release(code) {
    listeners.get("keyup")({ code });
  }
  function press(code) {
    key(code);
    release(code);
  }
  function pad(index) {
    const p = {
      index,
      connected: true,
      axes: [0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
    };
    pads.push(p);
    return p;
  }
  function button(p, index) {
    p.buttons[index].pressed = true;
    advance();
    p.buttons[index].pressed = false;
    advance();
  }
  function launch(type = "ffa") {
    if (!element("lobby").hidden) {
      for (let i = 0; i < 4; i++) {
        const html = element("seats").innerHTML;
        const card = html.split("<article")[i + 1] || "";
        if (card.includes('data-action="ready"') && !card.includes("✓ READY"))
          element("seats").click({
            target: {
              closest: () => ({
                dataset: { seat: String(i), action: "ready" },
              }),
            },
          });
      }
      element("launch").click();
    }
    if (!element("mode-screen").hidden) {
      element(type === "teams" ? "mode-teams" : "mode-ffa").click();
      element("fly").click();
    }
  }
  return {
    digest: () => trace.digest("hex"),
    launch,
    soundEvents,
    soundCalls,
    element,
    advance,
    key,
    press,
    release,
    pad,
    button,
    listeners,
    disconnect(p) {
      pads = pads.filter((q) => q !== p);
      advance();
    },
    reconnect(p) {
      pads.push(p);
      advance();
    },
    get match() {
      return latest;
    },
  };
}
module.exports = { fixture };
