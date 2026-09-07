/* Procedural chiptune effects. No downloaded assets or network dependency. */
(function (root) {
  "use strict";
  // Mount voices range from warm flutter and airy chirps to a soft buzz and moth wings.
  // Keep the pitched component quiet so four birds don't become a chorus of boops.
  const FLAPS = [
    {
      pitch: 190,
      end: 130,
      duration: 0.14,
      wave: "triangle",
      volume: 0.045,
      air: 0.022,
      cutoff: 700,
    },
    {
      pitch: 440,
      end: 620,
      duration: 0.12,
      wave: "triangle",
      volume: 0.028,
      air: 0.018,
      cutoff: 1100,
    },
    {
      pitch: 310,
      end: 220,
      duration: 0.16,
      wave: "sine",
      volume: 0.04,
      air: 0.02,
      cutoff: 600,
    },
    {
      pitch: 560,
      end: 420,
      duration: 0.13,
      wave: "triangle",
      volume: 0.018,
      air: 0.016,
      cutoff: 1450,
    },
    {
      pitch: 150,
      end: 95,
      duration: 0.15,
      wave: "triangle",
      volume: 0.025,
      air: 0.025,
      cutoff: 600,
    },
    {
      pitch: 235,
      end: 210,
      duration: 0.1,
      wave: "sawtooth",
      volume: 0.016,
      air: 0.009,
      cutoff: 900,
    },
    {
      pitch: 370,
      end: 280,
      duration: 0.18,
      wave: "sine",
      volume: 0.015,
      air: 0.024,
      cutoff: 1800,
    },
    {
      pitch: 280,
      end: 440,
      duration: 0.12,
      wave: "sine",
      volume: 0.025,
      air: 0.018,
      cutoff: 1300,
    },
  ];
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
    envelope(source, duration, volume, delay = 0, filter = null, soft = false) {
      const t = this.context.currentTime + delay,
        gain = this.context.createGain();
      gain.gain.setValueAtTime(soft ? 0 : 0.001, t);
      gain.gain.linearRampToValueAtTime(volume, t + (soft ? 0.025 : 0.003));
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        t + duration - (soft ? 0.015 : 0),
      );
      if (soft) gain.gain.linearRampToValueAtTime(0, t + duration);
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
      soft = false,
    ) {
      if (!this.enabled || this.context?.state !== "running") return;
      const oscillator = this.context.createOscillator(),
        t = this.context.currentTime + delay;
      oscillator.type = type;
      // Flaps glide smoothly; the other effects retain their arcade pitch steps.
      if (soft) {
        oscillator.frequency.setValueAtTime(frequency, t);
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(20, end),
          t + duration * 0.8,
        );
      } else
        for (let i = 0; i < 7; i++)
          oscillator.frequency.setValueAtTime(
            Math.max(20, frequency * Math.pow(end / frequency, i / 6)),
            t + (i * duration) / 7,
          );
      this.envelope(oscillator, duration, volume, delay, null, soft);
    }
    hiss(duration, volume, cutoff, soft = false) {
      const source = this.context.createBufferSource(),
        filter = this.context.createBiquadFilter();
      source.buffer = this.noise;
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      this.envelope(source, duration, volume, 0, filter, soft);
    }
    play(kind, variant = 0) {
      if (!this.enabled || this.context?.state !== "running") return;
      const now = this.context.currentTime;
      const gap =
        kind === "zombie-pop" || kind === "splash"
          ? 0.04
          : kind === "step"
            ? 0.045
            : kind === "flap"
              ? 0.018
              : 0;
      const key = kind === "flap" ? `flap:${variant}` : kind;
      if (gap && now - (this.last[key] ?? -Infinity) < gap) return;
      this.last[key] = now;
      if (kind === "flap") {
        const flap = FLAPS[variant] || FLAPS[0];
        const pitchVariation = 1 + (Math.random() - 0.5) * 0.06;
        this.tone(
          flap.pitch * pitchVariation,
          flap.duration,
          flap.wave,
          flap.volume,
          flap.end * pitchVariation,
          0,
          true,
        );
        this.hiss(flap.duration, flap.air, flap.cutoff, true);
      } else if (kind === "splash") {
        this.hiss(0.18, 0.08, 1900, true);
        this.tone(320, 0.12, "sine", 0.04, 110);
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
      } else if (kind === "zombie-pop") {
        // A small rubbery splat: low thump, crushed noise, and a falling chirrup.
        const pitch = 1 + (variant % 3) * 0.09;
        this.tone(240 * pitch, 0.16, "triangle", 0.19, 38);
        this.hiss(0.11, 0.13, 1300);
        this.tone(690 * pitch, 0.085, "square", 0.055, 105, 0.025);
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
