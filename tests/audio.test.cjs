const { test } = require("node:test");
const assert = require("node:assert/strict");
const ArcadeAudio = require("../audio.js");
function fixture(initial = "running") {
  const nodes = [];
  const param = () => ({
    value: 0,
    values: [],
    setValueAtTime(v, t) {
      this.value = v;
      this.values.push([v, t]);
    },
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  const node = (kind) => {
    const n = {
      kind,
      gain: param(),
      frequency: param(),
      connect() {},
      disconnect() {
        this.disconnected = true;
      },
      start(t) {
        this.started = t;
      },
      stop(t) {
        this.stopped = t;
      },
    };
    nodes.push(n);
    return n;
  };
  class Context {
    constructor() {
      this.currentTime = 10;
      this.sampleRate = 44100;
      this.state = initial;
      this.destination = {};
    }
    createGain() {
      return node("gain");
    }
    createOscillator() {
      return node("tone");
    }
    createBufferSource() {
      return node("noise");
    }
    createBiquadFilter() {
      return node("filter");
    }
    createBuffer(ch, length) {
      return { getChannelData: () => new Float32Array(length) };
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
  }
  const audio = new ArcadeAudio(Context);
  return { audio, nodes };
}
test("sound defaults on but creates audio only after user activation", () => {
  const { audio } = fixture("suspended");
  assert.equal(audio.enabled, true);
  assert.equal(audio.context, null);
  audio.unlock();
  assert.equal(audio.context.state, "running");
  assert.equal(audio.blocked, false);
});
test("flap, step and death schedule distinct bounded arcade sounds", () => {
  const { audio, nodes } = fixture();
  audio.unlock();
  audio.play("flap");
  assert.equal(nodes.filter((n) => n.kind === "tone").length, 1);
  assert.equal(nodes.filter((n) => n.kind === "noise").length, 1);
  audio.context.currentTime += 1;
  audio.play("step", 0);
  audio.context.currentTime += 1;
  audio.play("step", 1);
  const steps = nodes.filter((n) => n.kind === "tone").slice(1);
  assert.notEqual(
    steps[0].frequency.values[0][0],
    steps[1].frequency.values[0][0],
  );
  audio.play("death");
  assert.equal(nodes.filter((n) => n.kind === "noise").length, 2);
  assert.equal(nodes.filter((n) => n.kind === "tone").length, 6);
  for (const n of nodes.filter(
    (n) => n.kind === "tone" || n.kind === "noise",
  )) {
    assert.ok(n.stopped > n.started && n.stopped - n.started < 0.5);
    n.onended();
    assert.equal(n.disconnected, true);
  }
});
test("mute silences existing voices and suppresses new effects until enabled", () => {
  const { audio, nodes } = fixture();
  audio.unlock();
  audio.play("death");
  audio.toggle();
  assert.equal(audio.master.gain.value, 0);
  const count = nodes.length;
  audio.play("flap");
  audio.tone(300, 0.1);
  assert.equal(nodes.length, count);
  audio.toggle();
  assert.equal(audio.master.gain.value, 0.55);
  audio.play("flap");
  assert.ok(nodes.length > count);
});
test("simultaneous footsteps are limited without suppressing death effects", () => {
  const { audio, nodes } = fixture();
  audio.unlock();
  audio.play("step");
  audio.play("step");
  assert.equal(nodes.filter((n) => n.kind === "tone").length, 1);
  audio.play("death");
  audio.play("death");
  assert.equal(nodes.filter((n) => n.kind === "noise").length, 2);
});
test("blocked or unavailable browser audio is recoverable without crashing", () => {
  const { audio } = fixture("suspended");
  audio.unlock();
  audio.context.state = "suspended";
  audio.toggle();
  assert.equal(audio.enabled, true);
  assert.equal(audio.blocked, false);
  const unavailable = new ArcadeAudio(undefined);
  unavailable.unlock();
  assert.equal(unavailable.enabled, false);
  unavailable.play("death");
});

test("respawn plays a rising chime with a short shimmer and obeys mute", () => {
  const { audio, nodes } = fixture();
  audio.unlock();
  audio.play("spawn");
  const notes = nodes.filter((n) => n.kind === "tone");
  assert.equal(notes.length, 5);
  for (let i = 1; i < notes.length; i++) {
    assert.ok(
      notes[i].frequency.values[0][0] > notes[i - 1].frequency.values[0][0],
    );
    assert.ok(notes[i].started > notes[i - 1].started);
  }
  assert.ok(Math.max(...notes.map((n) => n.stopped)) - notes[0].started < 0.65);
  audio.toggle();
  const count = nodes.length;
  audio.play("spawn");
  assert.equal(nodes.length, count);
});
