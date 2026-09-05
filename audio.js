/* Procedural chiptune effects. No downloaded assets or network dependency. */
(function (root) {
  "use strict";
  class ArcadeAudio {
    constructor(Context, onChange = () => {}) {
      this.Context = Context;
      this.onChange = onChange;
      this.enabled = true;
      this.context = null;
      this.last = {};
    }
    get blocked() {
      return this.enabled && this.context && this.context.state !== "running";
    }
    unlock() {
      if (!this.enabled) return;
      try {
        if (!this.context) {
          this.context = new this.Context();
          this.master = this.context.createGain();
          this.master.gain.value = 0.55;
          this.master.connect(this.context.destination);
          this.context.onstatechange = () => this.onChange();
          const length = Math.ceil(this.context.sampleRate * 0.5);
          this.noise = this.context.createBuffer(
            1,
            length,
            this.context.sampleRate,
          );
          const samples = this.noise.getChannelData(0);
          let value = 0;
          for (let i = 0; i < length; i++) {
            if (i % 6 === 0) value = Math.random() < 0.5 ? -1 : 1;
            samples[i] = value;
          }
        }
        if (this.context.state !== "running")
          this.context
            .resume()
            .then(() => this.onChange())
            .catch(() => this.onChange());
      } catch {
        this.enabled = false;
      }
      this.onChange();
    }
    toggle() {
      if (this.blocked) {
        this.unlock();
        return;
      }
      this.enabled = !this.enabled;
      if (this.master)
        this.master.gain.setValueAtTime(
          this.enabled ? 0.55 : 0,
          this.context.currentTime,
        );
      if (this.enabled) this.unlock();
      this.onChange();
    }
    envelope(source, duration, volume, delay = 0, filter = null) {
      const t = this.context.currentTime + delay,
        gain = this.context.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      if (filter) {
        source.connect(filter);
        filter.connect(gain);
      } else source.connect(gain);
      gain.connect(this.master);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (filter) filter.disconnect();
      };
      source.start(t);
      source.stop(t + duration);
    }
    tone(
      frequency,
      duration,
      type = "square",
      volume = 0.1,
      end = frequency / 2,
      delay = 0,
    ) {
      if (!this.enabled || this.context?.state !== "running") return;
      const oscillator = this.context.createOscillator(),
        t = this.context.currentTime + delay;
      oscillator.type = type;
      // Discrete pitch steps give the effects an early arcade sound.
      for (let i = 0; i < 7; i++)
        oscillator.frequency.setValueAtTime(
          Math.max(20, frequency * Math.pow(end / frequency, i / 6)),
          t + (i * duration) / 7,
        );
      this.envelope(oscillator, duration, volume, delay);
    }
    hiss(duration, volume, cutoff) {
      const source = this.context.createBufferSource(),
        filter = this.context.createBiquadFilter();
      source.buffer = this.noise;
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      this.envelope(source, duration, volume, 0, filter);
    }
    play(kind, variant = 0) {
      if (!this.enabled || this.context?.state !== "running") return;
      const now = this.context.currentTime;
      const gap = kind === "step" ? 0.045 : kind === "flap" ? 0.018 : 0;
      if (gap && now - (this.last[kind] ?? -Infinity) < gap) return;
      this.last[kind] = now;
      if (kind === "flap") {
        this.tone(260, 0.095, "square", 0.12, 85);
        this.hiss(0.055, 0.07, 1300);
      } else if (kind === "step") {
        this.tone(variant % 2 ? 145 : 185, 0.04, "square", 0.07, 65);
      } else if (kind === "spawn") {
        // A rising major arpeggio, ending in a soft octave shimmer.
        [523.25, 659.25, 783.99, 1046.5].forEach((pitch, i) => {
          this.tone(
            pitch,
            i === 3 ? 0.3 : 0.14,
            "square",
            0.08,
            pitch,
            i * 0.1,
          );
        });
        this.tone(2093, 0.28, "triangle", 0.045, 2093, 0.32);
      } else if (kind === "death") {
        this.hiss(0.38, 0.32, 2400);
        this.tone(170, 0.28, "sawtooth", 0.2, 25);
        this.tone(930, 0.1, "square", 0.075, 400, 0.065);
        this.tone(570, 0.12, "square", 0.055, 140, 0.15);
      }
    }
  }
  if (typeof module !== "undefined" && module.exports)
    module.exports = ArcadeAudio;
  else root.ArcadeAudio = ArcadeAudio;
})(globalThis);
