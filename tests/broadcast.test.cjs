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
  for (let i = 0; i < 20; i++) b.say("flame", { a: "EMBER" });
  b.say("out", { a: "A", v: "B" }, 2);
  assert.equal(b.queue.length, 4);
  assert.equal(b.queue[0].priority, 2);
  b.step(15);
  assert.equal(b.queue.length, 0);
  b.reset();
  assert.equal(b.current, null);
  assert.equal(b.queue.length, 0);
});
test("announcer varies event calls and remains silent without new events", () => {
  const b = new Broadcast(() => 0);
  b.say("ko", { a: "A", v: "B" });
  const first = b.current.text;
  b.step(5);
  b.say("ko", { a: "A", v: "B" });
  assert.notEqual(b.current.text, first);
  b.reset();
  assert.equal(b.step(12), "");
  assert.equal(b.step(120), "");
  assert.equal(b.current, null);
});

test("finished calls stay visible until replaced and reset clears them", () => {
  const b = new Broadcast(() => 0);
  b.say("rocket", { a: "EMBER" });
  const first = b.step(0);
  assert.equal(b.step(5), first);
  assert.equal(b.current, null);
  assert.equal(b.step(120), first);
  b.say("life", { a: "MINT" });
  const next = b.step(0);
  assert.notEqual(next, first);
  assert.match(next, /MINT/);
  assert.equal(b.step(5), next);
  b.reset();
  assert.equal(b.step(0), "");
});
