/* A bounded sports desk: one line at a time, never a stack over the arena. */
(function (root) {
  "use strict";
  const LINES = {
    ko: [
      "{a} sends {v} back to the nest!",
      "What a hit! {a} catches {v} napping.",
      "{a} wins that aerial argument with {v}!",
      "{v} meets the business end of {a}!",
      "{a} takes the high ground. {v} takes the fall.",
    ],
    out: [
      "{v} is out! {a} closes the book on that round.",
      "No lives left for {v}. {a} clears the airspace!",
      "{a} grounds {v} for the rest of the round!",
    ],
    life: [
      "{a} finds a golden lifeline. Back in business!",
      "One more life for {a}. This story is not over!",
      "{a} raids the treasure chest. One life restored!",
    ],
    capped: [
      "{a} takes the gold with a full tank of lives!",
      "No room for another life, but {a} denies the field that feather!",
    ],
    power: [
      "{a} has a new trick. Watch this airspace!",
      "{a} picks up something spicy. The plot thickens!",
      "That pickup could change everything for {a}!",
    ],
    pickup: [
      "Something shiny has landed. Who wants it?",
      "Fresh bait on the islands. This could get scrappy!",
      "Eyes on the prize, flyers. A pickup is in play!",
    ],
    round: [
      "Round {r}. First to three wins. Let the feathers fly!",
      "Round {r} is airborne. Keep your beaks up!",
      "Welcome to round {r}. Same sky, fresh grudges!",
    ],
    idle: [
      "A tense patch of sky. Somebody has to blink.",
      "The high ground is open for business.",
      "That is competitive flying. No seat belts, no apologies.",
      "The islands are solid. The tactics are questionable.",
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
      this.idle = 0;
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
      this.idle = 0;
    }
    step(dt) {
      this.queue.forEach((e) => (e.age += dt));
      this.queue = this.queue.filter((e) => e.age < 14);
      if (this.current) {
        this.current.remaining -= dt;
        if (this.current.remaining <= 0)
          this.current = this.queue.shift() || null;
      } else {
        this.idle += dt;
        if (this.idle >= 12) this.say("idle");
      }
      return (
        this.current?.text || "The sky is live. We are watching every wingbeat."
      );
    }
  }
  if (typeof module !== "undefined" && module.exports)
    module.exports = { Broadcast };
  else root.FeatherfallBroadcast = { Broadcast };
})(typeof globalThis !== "undefined" ? globalThis : this);
