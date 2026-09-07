const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Match } = require("../engine.js");
test("boost recharge pulses once, fades and can pulse after the next recharge", () => {
  const m = new Match([{ character: 0 }, { character: 1 }]);
  const p = m.players[0];
  assert.equal(p.boostReadyGlow, 0);
  p.boostCharge = 0.999;
  m.step(1 / 120);
  assert.equal(p.boostReadyGlow, 0.5);
  for (let i = 0; i < 80; i++) m.step(1 / 120);
  assert.equal(p.boostReadyGlow, 0);
  m.step(1 / 120);
  assert.equal(p.boostReadyGlow, 0);
  p.boostCharge = 0.999;
  m.step(1 / 120);
  assert.equal(p.boostReadyGlow, 0.5);
  m.spawn(p);
  assert.equal(p.boostReadyGlow, 0);
});
test("rocket unlimited boost does not repeatedly trigger recharge glow", () => {
  const m = new Match([{ character: 0 }, { character: 1 }]);
  const p = m.players[0];
  p.boostCharge = 0.4;
  m.equip(p, "rocket");
  for (let i = 0; i < 120; i++) m.step(1 / 120, [{ boost: true }]);
  assert.equal(p.boostReadyGlow, 0);
});
