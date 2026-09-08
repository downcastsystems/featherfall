// Golden captured from the pre-split game.js. Covers draw calls, UI and simulation.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./presentation-fixture.cjs");
const fs = require("node:fs");
const path = require("node:path");
function capture(legacy) {
  const originalRandom = Math.random;
  let seed = 7419;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const math = Object.create(Math);
  math.random = random;
  Math.random = random;
  try {
    const f = fixture({ legacy, trace: true, math });
    f.advance();
    f.press("Enter");
    f.press("Digit1");
    f.press("Digit2");
    f.launch("teams");
    f.advance(3.2);
    const states = [];
    for (let arena = 0; arena < 8; arena++) {
      f.press("KeyP");
      f.key("KeyW");
      f.key("KeyD");
      f.advance(0.3);
      f.release("KeyW");
      f.release("KeyD");
      f.press("KeyE");
      f.advance(0.3);
      states.push(JSON.stringify(f.match));
      if (arena < 7) {
        f.press("KeyN");
        f.advance(3.2);
      }
    }
    f.press("Escape");
    f.advance();
    f.press("Escape");
    f.advance();
    return {
      drawing: f.digest(),
      states,
      hud: f.element("hud").innerHTML,
      sounds: f.soundCalls,
    };
  } finally {
    Math.random = originalRandom;
  }
}
test("presentation split preserves drawing commands and seeded gameplay across all arenas", () => {
  const actual = capture(process.env.PARITY_LEGACY);
  const file = path.join(__dirname, "presentation-golden.json");
  if (process.env.PARITY_CAPTURE)
    fs.writeFileSync(file, JSON.stringify(actual, null, 2) + "\n");
  else assert.deepEqual(actual, JSON.parse(fs.readFileSync(file, "utf8")));
});
