/* sprites: presentation module. Dependencies: birds. */
(function (root) {
  "use strict";
  root.OneBigSkyUI ||= {};
  root.OneBigSkyUI.sprites = function createSprites(state, deps) {
    function drawZombie(c, z, time) {
      c.save();
      c.translate(Math.round(z.x), Math.round(z.y));
      // Rising from the soil, then shuffling or panicking with hands overhead.
      if (z.emerge > 0) {
        c.beginPath();
        c.rect(-18, -26, 36, 26);
        c.clip();
        c.translate(0, Math.ceil((z.emerge / 0.9) * 18));
      }
      c.scale(z.vx < 0 ? -1 : 1, 1);
      const r = (x, y, w, h, color) => {
        c.fillStyle = color;
        c.fillRect(x, y, w, h);
      };
      const falling = !z.grounded && z.emerge <= 0;
      const phase = Math.floor(time * (falling ? 10 : 8) + z.id) % 4;
      const leg = z.grounded ? (phase % 2 ? 2 : -2) : 1;
      r(-4, -10, 8, 7, "#343041");
      r(-3, -10, 7, 5, "#81718e");
      r(-4, -17, 8, 8, "#4f6950");
      r(-3, -17, 7, 6, "#b5cb8b");
      r(-4, -18, 6, 2, "#687553");
      r(2, -15, 2, 2, "#20232e");
      r(1, -11, 4, 1, "#586143");
      if (falling) {
        // Wide eye and a little screaming mouth; the head never flips or rotates.
        r(1, -16, 3, 3, "#e6edc7");
        r(3, -15, 1, 2, "#20232e");
        r(1, -12, 3, 3, "#20232e");
        r(2, -10, 2, 1, "#bc777c");
        // Uneven raised elbows and reaching hands, rather than a rotary arm cycle.
        const [leftX, leftY, rightX, rightY] = [
          [-7, -23, 7, -18],
          [-10, -19, 6, -24],
          [-8, -24, 9, -21],
          [-6, -20, 8, -23],
        ][phase];
        r(leftX, -11, -leftX - 3, 2, "#b5cb8b");
        r(leftX, leftY, 2, -leftY - 9, "#b5cb8b");
        r(leftX - 1, leftY - 2, 4, 3, "#cbdba0");
        r(leftX - 1, leftY - 3, 1, 2, "#cbdba0");
        r(4, -10, rightX - 2, 2, "#b5cb8b");
        r(rightX, rightY, 2, -rightY - 8, "#b5cb8b");
        r(rightX - 1, rightY - 2, 4, 3, "#cbdba0");
        r(rightX + 2, rightY - 3, 1, 2, "#cbdba0");
        // Scissoring knees and mismatched kicks keep the whole body looking frantic.
        const [leftKick, rightKick] = [
          [-6, 4],
          [-4, 7],
          [-7, 5],
          [-5, 6],
        ][phase];
        r(-3, -3, 2, 4, "#484252");
        r(leftKick, -1, -leftKick - 1, 2, "#484252");
        r(leftKick, -1, 2, phase % 2 ? 5 : 2, "#484252");
        r(leftKick - 1, phase % 2 ? 3 : 0, 4, 2, "#b5cb8b");
        r(2, -3, 2, 4, "#484252");
        r(2, -1, rightKick, 2, "#484252");
        r(rightKick, -1, 2, phase % 2 ? 2 : 5, "#484252");
        r(rightKick, phase % 2 ? 0 : 3, 4, 2, "#b5cb8b");
      } else {
        r(-3, -3, 2, 3 + Math.max(0, leg), "#484252");
        r(2, -3, 2, 3 + Math.max(0, -leg), "#484252");
        r(-4, Math.max(0, leg), 4, 2, "#b5cb8b");
        r(1, Math.max(0, -leg), 4, 2, "#b5cb8b");
        r(4, -10, 6, 2, "#b5cb8b");
        r(8, -9, 2, 3, "#b5cb8b");
        r(-6, -9, 3, 5, "#8d9f70");
      }
      c.restore();
    }
    function drawBird(
      c,
      x,
      y,
      character,
      facing = 1,
      flap = false,
      grounded = false,
      scale = 1,
      time = 0,
      diving = false,
      rider = true,
    ) {
      const b = deps.birds[character];
      c.save();
      c.translate(Math.round(x), Math.round(y));
      c.scale(scale * facing, scale);
      c.imageSmoothingEnabled = false;
      const r = (x, y, w, h, color) => {
        c.fillStyle = color;
        c.fillRect(x, y, w, h);
      };
      if (diving) {
        // Three stepped poses compress the wings against a vertical body.
        // Use simulation time so the pose and slipstream freeze while paused.
        const frame = Math.floor(time * 12) % 3;
        const tuck = [0, 1, 0][frame];
        const stream = Math.floor(time * 36) % 12;
        for (const [sx, phase] of [
          [-16, 0],
          [14, 6],
        ]) {
          r(sx, -30 - ((stream + phase) % 12), 2, 11, b.color + "70");
          r(sx + 1, -16 - ((stream + phase) % 8), 1, 5, b.light + "99");
        }
        // Tail first, head down: a narrow spear-shaped silhouette.
        r(-5, -21, 9, 13, b.dark);
        r(-3, -24, 5, 12, b.color);
        r(-6, -12, 13, 20, "#0c1625");
        r(-5, -13, 11, 20, b.dark);
        r(-2, -12, 7, 22, b.color);
        r(3, -7, 3, 13, b.light);
        // Folded wings trail upward instead of flapping out to the sides.
        r(-9 + tuck, -17, 4, 19, b.dark);
        r(-8 + tuck, -15, 2, 13, b.color);
        r(6 - tuck, -15, 4, 17, b.dark);
        r(7 - tuck, -13, 2, 12, b.light);
        if (b.mount === "dragon") {
          r(-4, 5, 11, 8, b.color);
          r(-2, 12, 7, 5, b.color);
          r(-5, 4, 2, 6, b.light);
          r(6, 4, 2, 6, b.light);
          r(-5, -26, 2, 7, b.light);
          r(-3, 9, 2, 2, "#111829");
        } else if (b.mount === "pegasus") {
          r(-3, 1, 8, 13, b.light);
          r(-2, 12, 6, 5, b.light);
          r(-5, 0, 3, 12, b.dark);
          r(3, 1, 3, 5, b.color);
          r(0, 10, 2, 2, "#111829");
          r(-5, -25, 7, 5, b.light);
          r(-10 + tuck, -16, 2, 11, b.light);
          r(-7, -3, 3, 7, b.light);
          r(-8, -4, 4, 2, b.dark);
        } else if (b.mount === "pterodactyl") {
          r(-3, 3, 8, 9, b.color);
          r(-2, 11, 5, 6, b.light);
          r(-1, 17, 2, 5, b.light);
          r(-4, -2, 3, 7, b.dark);
          r(-5, -5, 2, 4, b.color);
          r(-2, 7, 2, 2, "#111829");
        } else if (b.mount === "squirrel") {
          r(-9, -27, 15, 13, b.dark);
          r(-7, -29, 11, 11, b.color);
          r(-4, -27, 7, 5, b.light);
          r(-8, -15, 3, 19, b.light);
          r(6, -14, 3, 17, b.light);
          r(-4, 3, 10, 11, b.color);
          r(-5, 1, 3, 5, b.dark);
          r(4, 1, 3, 5, b.dark);
          r(-2, 10, 6, 6, b.light);
          r(-1, 15, 3, 3, "#322c30");
          r(2, 7, 2, 2, "#231f28");
        } else if (b.mount === "bee") {
          r(-1, -28, 2, 5, "#e6dfcb");
          r(-2, -24, 4, 4, b.dark);
          r(-4, -11, 10, 20, b.color);
          r(-4, -7, 10, 4, b.dark);
          r(-4, 1, 10, 4, b.dark);
          r(-10 + tuck, -18, 5, 16, "#edf0dc");
          r(7 - tuck, -17, 5, 16, "#bdcbd5");
          r(-3, 8, 9, 9, b.color);
          r(2, 11, 2, 2, b.dark);
          r(-4, 15, 2, 7, b.dark);
          r(5, 15, 2, 7, b.dark);
        } else if (b.mount === "fish") {
          r(-7, -26, 5, 7, b.color);
          r(3, -26, 5, 7, b.color);
          r(-9, -14, 5, 18, b.dark);
          r(6, -14, 5, 18, b.light);
          r(-4, 1, 10, 14, b.color);
          r(-2, 10, 7, 8, b.light);
          r(2, 7, 3, 4, "#162c48");
          r(3, 7, 1, 1, "#fff");
          r(-2, 17, 5, 2, b.dark);
        } else if (b.mount === "moth") {
          // Fold the patterned lobes upward for the dive.
          for (const side of [-1, 1]) {
            const wx = side < 0 ? -13 + tuck : 6 - tuck;
            r(wx, -23, 7, 25, "#777f96");
            r(wx + 1, -21, 5, 25, "#c6bbc0");
            r(wx + 2, -18, 4, 24, "#f4efdf");
            r(wx + 2, -11, 4, 6, "#777f96");
            r(wx + 3, -10, 2, 4, "#d7c4a9");
            r(wx + 3, -9, 1, 2, "#45556d");
          }
          r(-4, 3, 12, 11, b.light);
          r(-2, 12, 8, 4, b.light);
          r(1, 7, 5, 5, "#303748");
          r(2, 7, 1, 1, "#fffaf0");
          for (const ax of [-3, 6]) {
            r(ax, 14, 1, 9, b.dark);
            r(ax - 2, 17, 5, 1, b.color);
            r(ax - 2, 20, 5, 1, b.light);
            r(ax - 1, 22, 3, 1, b.color);
          }
        } else {
          r(-4, 3, 10, 9, b.color);
          r(-2, 6, 7, 6, b.light);
          // The same small tip dip, rotated with the diving bill.
          r(-2, 12, 5, 10, "#edbe78");
          r(-4, 20, 2, 2, "#edbe78");
          r(1, 12, 2, 8, "#ffe1aa");
          r(-2, 8, 2, 2, "#111829");
          r(-7, -24, 4, 8, b.color);
          r(-10 + tuck, -16, 2, 10, b.light);
        }
        if (rider) {
          // Rider leans flat against the mount, scarf streaming above the helmet.
          r(-9, -15, 5, 11, "#273447");
          r(-10, -4, 6, 6, "#eddbc2");
          r(-11, -5, 8, 3, b.color);
          r(-11, -2, 3, 4, b.dark);
          r(-5, 0, 2, 2, "#121e2a");
          r(-8, -13, 4, 8, b.light);
          r(-5, -7, 4, 3, "#273447");
          r(-12, -13, 3, 8, b.color);
          r(-13 + frame, -20, 2, 8, b.dark);
        }
        c.restore();
        return;
      }
      // All artwork stays compact; mount choice never changes engine collision bounds.
      const walk = grounded ? Math.round(Math.sin(time * 24) * 2) : 0;
      const wing = (feathered = false) => {
        if (flap) {
          r(-7, -9, 5, 13, b.dark);
          r(-12, -15, 6, 10, b.color);
          r(-17, -20, 6, 7, b.light);
          if (!feathered) {
            r(-17, -13, 3, 5, b.color);
            r(-12, -8, 3, 5, b.color);
          }
        } else {
          r(-8, -2, 12, 6, b.dark);
          r(-13, 3, 12, 4, b.color);
          r(-17, 6, 8, 3, b.light);
          if (feathered) {
            r(-14, 8, 3, 3, b.light);
            r(-9, 8, 3, 3, b.light);
          }
        }
      };
      if (b.mount === "dragon") {
        r(-13, -5, 25, 13, b.dark);
        r(-11, -6, 23, 9, b.color);
        r(-6, 5, 16, 4, b.light);
        r(8, -11, 9, 11, b.color);
        r(14, -6, 7, 5, b.color);
        r(13, -10, 2, 2, "#111829");
        r(8, -15, 3, 5, b.light);
        r(15, -14, 3, 5, b.light);
        r(-19, 0, 8, 4, b.dark);
        r(-23, -4, 5, 5, b.color);
        r(-25, -8, 3, 5, b.light);
        wing();
        r(-8, 8, 4, 5 + walk, b.dark);
        r(6, 8, 4, 5 - walk, b.dark);
        r(-8, 12 + walk, 7, 2, b.light);
        r(6, 12 - walk, 7, 2, b.light);
      } else if (b.mount === "pegasus") {
        r(-13, -4, 25, 12, b.light);
        r(-10, 6, 20, 3, b.color);
        r(7, -11, 6, 12, b.light);
        r(10, -14, 8, 7, b.light);
        r(15, -10, 7, 4, b.light);
        r(11, -18, 3, 5, b.color);
        r(6, -14, 4, 13, b.dark);
        r(15, -12, 2, 2, "#111829");
        r(-18, 0, 5, 9, b.color);
        r(-21, 6, 6, 5, b.dark);
        wing(true);
        for (const [lx, offset] of [
          [-10, walk],
          [-5, -walk],
          [6, -walk],
          [10, walk],
        ]) {
          r(lx, 7, 2, 6 + offset, b.light);
          r(lx, 12 + offset, 4, 2, b.dark);
        }
      } else if (b.mount === "pterodactyl") {
        r(-11, -4, 22, 11, b.dark);
        r(-8, -5, 20, 9, b.color);
        r(-5, 5, 12, 4, b.light);
        r(6, -11, 8, 11, b.color);
        r(14, -8, 10, 3, b.light);
        r(20, -7, 6, 2, b.light);
        r(4, -15, 4, 6, b.dark);
        r(1, -18, 4, 5, b.color);
        r(11, -10, 2, 2, "#111829");
        r(-19, 0, 8, 3, b.dark);
        r(-23, -2, 5, 2, b.color);
        wing();
        r(-6, 8, 2, 5 + walk, b.color);
        r(4, 8, 2, 5 - walk, b.color);
        r(-7, 12 + walk, 5, 2, b.light);
        r(3, 12 - walk, 5, 2, b.light);
      } else if (b.mount === "squirrel") {
        // Curled bushy tail and a broad gliding membrane.
        r(-23, -11, 10, 19, b.dark);
        r(-25, -8, 8, 12, b.color);
        r(-21, -14, 8, 8, b.color);
        r(-18, -11, 5, 7, b.light);
        r(-16, 0, 8, 9, b.dark);
        r(-11, -5, 23, 13, b.color);
        r(-6, 4, 16, 5, b.light);
        if (!grounded) {
          r(-14, flap ? -13 : -4, 12, flap ? 18 : 14, b.dark);
          r(-12, flap ? -11 : -2, 10, flap ? 14 : 11, b.light);
          r(-9, flap ? -9 : 1, 10, 9, b.color);
          r(-15, flap ? -14 : 8, 4, 3, b.dark);
        }
        r(7, -12, 11, 11, b.color);
        r(8, -16, 4, 6, b.dark);
        r(14, -15, 3, 5, b.dark);
        r(11, -6, 9, 5, b.light);
        r(19, -6, 3, 3, "#322c30");
        r(14, -10, 2, 2, "#231f28");
        r(15, -1, 2, 2, "#fff1d2");
        r(-7, 8, 3, 5 + walk, b.dark);
        r(7, 8, 3, 5 - walk, b.dark);
        r(-8, 12 + walk, 6, 2, b.light);
        r(6, 12 - walk, 6, 2, b.light);
      } else if (b.mount === "bee") {
        r(-13, -6, 25, 14, b.dark);
        r(-10, -8, 19, 18, b.color);
        r(-14, -3, 28, 8, b.color);
        r(-8, -7, 4, 16, b.dark);
        r(1, -7, 4, 16, b.dark);
        r(-18, -1, 5, 4, b.dark);
        r(-21, 0, 3, 2, "#e6dfcb");
        r(-23, 0, 2, 1, "#e6dfcb");
        // Two translucent-looking pixel wings extend clear of the rider.
        r(-17, flap ? -18 : -10, 8, 10, "#bdcbd5");
        r(-15, flap ? -20 : -12, 6, 10, "#edf0dc");
        r(4, flap ? -17 : -10, 7, 9, "#bdcbd5");
        r(5, flap ? -19 : -12, 7, 8, "#edf0dc");
        r(9, -10, 10, 11, b.color);
        r(16, -7, 3, 3, b.dark);
        r(10, -15, 2, 6, b.dark);
        r(16, -14, 2, 5, b.dark);
        r(8, -17, 4, 3, b.dark);
        r(17, -16, 3, 3, b.dark);
        r(16, -2, 5, 2, b.light);
        for (const lx of [-8, 0, 8]) {
          r(lx, 8, 2, 4 + walk, b.dark);
          r(lx, 11 + walk, 5, 2, b.dark);
        }
      } else if (b.mount === "fish") {
        // Forked tail, silver belly and long translucent pectoral fins.
        r(-23, -10, 5, 8, b.color);
        r(-23, 5, 5, 8, b.color);
        r(-20, -6, 5, 15, b.dark);
        r(-16, -4, 28, 12, b.dark);
        r(-12, -7, 27, 15, b.color);
        r(-10, 4, 24, 5, b.light);
        r(10, -5, 10, 10, b.color);
        r(18, 0, 3, 3, b.light);
        r(12, -4, 4, 4, "#172c48");
        r(13, -4, 1, 1, "#fff");
        r(7, -2, 1, 7, b.dark);
        r(-4, -12, 9, 5, b.dark);
        r(-1, -14, 4, 3, b.color);
        r(-16, flap ? -17 : 1, 13, flap ? 14 : 7, "#a9dfed");
        r(-20, flap ? -20 : 6, 10, 5, "#d8f3ff");
        r(-14, flap ? -13 : 5, 13, 2, "#5ca5cc");
        r(1, 7, 8, 3, b.dark);
      } else if (b.mount === "moth") {
        // The upper wing pair keeps its broad patterned silhouette.
        const lift = grounded ? -2 : flap ? -11 : 3;
        const wingLobe = (x, y, mirror) => {
          const rows = [
            [4, 0, 9, 2],
            [1, 2, 16, 3],
            [0, 5, 20, 4],
            [1, 9, 21, 4],
            [3, 13, 19, 4],
            [6, 17, 15, 4],
            [10, 21, 10, 3],
          ];
          const wr = (a, d, w, h, color) =>
            r(x + (mirror ? -a - w : a), y + d, w, h, color);
          for (const [a, d, w, h] of rows) wr(a, d, w, h, "#777f96");
          for (const [a, d, w, h] of rows.slice(1, -1))
            wr(a + 2, d, w - 4, h, "#c6bbc0");
          for (const [a, d, w, h] of rows.slice(2, -1))
            wr(a + 4, d, w - 8, h, "#f4efdf");
          wr(8, 8, 7, 7, "#777f96");
          wr(9, 9, 5, 5, "#d7c4a9");
          wr(10, 10, 3, 3, "#45556d");
          wr(10, 10, 1, 1, "#fff8e4");
          wr(15, 18, 3, 2, "#a9a4b4");
        };
        wingLobe(15, -17 + lift, true);
        wingLobe(-31, -17 + lift, false);
        // Soft segmented abdomen and a fluffy collar around a large dark eye.
        r(-12, -2, 20, 10, b.color);
        r(-15, 0, 5, 6, b.dark);
        r(-10, 5, 16, 4, b.light);
        r(-12, 0, 2, 6, "#a5a7b3");
        r(-7, 1, 2, 7, "#b9bac4");
        r(-2, 2, 2, 6, "#b9bac4");
        r(3, -9, 12, 16, b.light);
        r(1, -5, 3, 10, b.color);
        r(5, 6, 3, 3, b.color);
        r(10, 5, 3, 3, b.light);
        r(7, -14, 12, 15, b.light);
        r(5, -11, 16, 9, b.light);
        r(12, -11, 6, 7, "#303748");
        r(13, -11, 2, 2, "#fffaf0");
        r(18, -4, 3, 2, b.color);
        // Branched antennae, slanting out from the fuzzy forehead.
        for (const [ax, ay] of [
          [8, -15],
          [17, -16],
        ]) {
          r(ax, ay - 6, 1, 8, b.dark);
          r(ax - 2, ay - 7, 2, 2, b.color);
          r(ax - 3, ay - 5, 3, 1, b.light);
          r(ax + 1, ay - 4, 3, 1, b.color);
          r(ax - 2, ay - 2, 2, 1, b.light);
        }
        // Three visible jointed insect legs, dangling slightly during flight.
        for (const [lx, offset] of [
          [-7, walk],
          [1, -walk],
          [9, walk],
        ]) {
          const knee = grounded ? offset : 1;
          r(lx, 8, 2, 3, b.dark);
          r(lx - 2, 10, 3, 2, b.dark);
          r(lx - 2, 11, 1, 2 + knee, b.dark);
          r(lx - 2, 12 + knee, 3, 1, b.color);
        }
      } else {
        r(-14, -3, 26, 12, "#0c1625");
        r(-11, -6, 20, 16, b.dark);
        r(-10, -5, 19, 10, b.color);
        r(-7, 5, 15, 4, b.light);
        r(6, -10, 9, 10, b.color);
        r(11, -8, 4, 4, b.light);
        r(12, -7, 2, 2, "#111829");
        // A broad bill with just a small downward dip at the tip.
        r(15, -7, 10, 5, "#edbe78");
        r(23, -2, 2, 2, "#edbe78");
        r(15, -7, 9, 2, "#ffe1aa");
        r(-18, -2, 7, 4, b.dark);
        r(-21, -5, 5, 4, b.color);
        wing(true);
        r(-7, 9, 2, 4 + walk, "#edbe78");
        r(4, 9, 2, 4 - walk, "#edbe78");
        r(-7, 12 + walk, 5, 2, "#edbe78");
        r(4, 12 - walk, 5, 2, "#edbe78");
      }
      if (rider) {
        r(-5, -15, 8, 9, "#273447");
        r(-4, -19, 7, 6, "#eddbc2");
        r(-6, -21, 10, 4, b.color);
        r(-6, -18, 3, 4, b.dark);
        r(1, -18, 2, 2, "#121e2a");
        r(-4, -12, 6, 5, b.light);
        r(-2, -7, 7, 3, "#263447");
        r(-10, -14, 6, 3, b.color);
        r(-14, -13, 5, 3, b.dark);
      }
      c.restore();
    }
    function pixelCloud(c, x, y, scale, color) {
      c.fillStyle = color;
      [
        [0, 12, 100, 10],
        [12, 3, 24, 15],
        [28, -6, 30, 25],
        [50, 2, 29, 18],
        [77, 8, 17, 12],
      ].forEach(([a, b, w, h]) =>
        c.fillRect(x + a * scale, y + b * scale, w * scale, h * scale),
      );
    }

    return { drawBird, pixelCloud, drawZombie };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
