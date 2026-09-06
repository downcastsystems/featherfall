/* A bounded sports desk: one line at a time, never a stack over the arena. */
(function (root) {
  "use strict";
  const LINES = {
    ko: [
      "{a} knocks out {v}. A bold attempt at being a target.",
      "{v} falls to {a}. The landing needs work. So does the flying.",
      "{a} sends {v} back to the nest. Do take notes this time.",
      "{a} gets the KO on {v}. Defense was apparently optional.",
      "{v} loses a life to {a}. An educational experience, surely.",
    ],
    out: [
      "{a} eliminates {v}. An excellent view of the rest of the round awaits.",
      "{v} is out, courtesy of {a}. Spectating may be the stronger event.",
      "{a} ends {v}'s round. Five lives, and that was the plan?",
    ],
    life: [
      "{a} gets a life back. Try keeping this one.",
      "One more life for {a}. Even the feather felt sorry for them.",
      "{a} collects a golden lifeline. A rare investment in survival.",
    ],
    capped: [
      "{a} takes the feather at full lives. Sharing was never an option.",
      "No room for another life, but {a} takes the feather anyway. Charming.",
    ],
    flame: [
      "{a} collects fireballs. Because personal space needed enforcement.",
      "{a} has a ring of fire. Finally, a warm personality.",
      "Fireballs for {a}. Subtlety has left the arena.",
    ],
    sawblade: [
      "{a} becomes a sawblade. A sharp improvement, frankly.",
      "{a} is now a spinning blade. A cutting remark made flesh.",
      "Sawblade for {a}. Steering is somebody else's problem now.",
    ],
    rocket: [
      "{a} gets unlimited boosts. More speed for those excellent decisions.",
      "{a} picks up a rocket. The same judgment, delivered faster.",
      "Rocket for {a}. Brakes remain a theoretical concept.",
    ],
    round: [
      "Round {r} begins. A fresh chance to learn what the ground does.",
      "Round {r}. Five lives each. Budget them better this time.",
      "Round {r} is underway. Confidence remains wildly ahead of ability.",
    ],
  };
  class Broadcast {
    constructor(rng = Math.random) {
      this.rng = rng;
      this.reset();
    }
    reset() {
      this.current = null;
      this.queue = [];
      this.last = "";
      this.displayed = "";
    }
    say(kind, names = {}, priority = 0) {
      const options = LINES[kind] || [kind];
      const candidates = options.filter((text) => text !== this.last);
      const pool = candidates.length ? candidates : options;
      const template =
        pool[Math.min(pool.length - 1, Math.floor(this.rng() * pool.length))];
      this.last = template;
      const text = template.replace(
        /\{(\w+)\}/g,
        (_, key) => names[key] ?? "the field",
      );
      const entry = { text, priority, remaining: 4.5, age: 0 };
      if (!this.current) this.current = entry;
      else {
        this.queue.push(entry);
        // Important calls go first, but a current sentence always gets its reading time.
        this.queue.sort((a, b) => b.priority - a.priority);
        this.queue = this.queue.slice(0, 4);
      }
    }
    step(dt) {
      this.queue.forEach((e) => (e.age += dt));
      this.queue = this.queue.filter((e) => e.age < 14);
      if (this.current) {
        this.displayed = this.current.text;
        this.current.remaining -= dt;
        if (this.current.remaining <= 0)
          this.current = this.queue.shift() || null;
      }
      return this.current?.text || this.displayed;
    }
  }
  if (typeof module !== "undefined" && module.exports)
    module.exports = { Broadcast };
  else root.FeatherfallBroadcast = { Broadcast };
})(typeof globalThis !== "undefined" ? globalThis : this);
