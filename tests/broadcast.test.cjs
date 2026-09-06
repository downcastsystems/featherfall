const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Broadcast } = require("../broadcast.js");
test("commentary reads one full call before the next simultaneous event", () => {
  const b = new Broadcast(() => 0);
  b.say("ko", { a: "EMBER", v: "MINT" }, 1);
  b.say("out", { a: "IRIS", v: "SOL" }, 2);
  assert.match(b.step(4), /EMBER.*MINT/);
  assert.match(b.step(0.6), /SOL.*IRIS|IRIS.*SOL/);
});
test("commentary queue is bounded, prioritized, expires stale calls and resets", () => {
  const b = new Broadcast(() => 0);
  b.say("round", { r: 1 });
  for (let i = 0; i < 20; i++) b.say("pickup");
  b.say("out", { a: "A", v: "B" }, 2);
  assert.equal(b.queue.length, 4);
  assert.equal(b.queue[0].priority, 2);
  b.step(15);
  assert.equal(b.queue.length, 0);
  b.reset();
  assert.equal(b.current, null);
  assert.equal(b.queue.length, 0);
});
test("announcer varies repeated calls and adds occasional idle commentary", () => {
  const b = new Broadcast(() => 0);
  b.say("ko", { a: "A", v: "B" });
  const first = b.current.text;
  b.step(5);
  b.say("ko", { a: "A", v: "B" });
  assert.notEqual(b.current.text, first);
  b.reset();
  assert.match(b.step(12), /sky|ground|flying|islands/i);
});
