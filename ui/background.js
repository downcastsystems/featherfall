/* background: presentation module. Dependencies: ARENAS, H, PLATFORM_DEPTH, W, pixelCloud. */
(function (root) {
  "use strict";
  root.OneBigSkyUI ||= {};
  root.OneBigSkyUI.background = function createBackground(state, deps) {
    const background = document.createElement("canvas");
    const bg = background.getContext("2d");
    function drawArenaSky(g, arena) {
      const polygon = (points, color) => {
        g.fillStyle = color;
        g.beginPath();
        points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.fill();
      };
      if (arena.motif === "factory") {
        for (const x of [80, 380, 680, 980, 1280, 1580, 1880]) {
          g.fillStyle = "#91a1a112";
          g.fillRect(x, 130, 12, 880);
          g.fillStyle = "#101c2633";
          g.fillRect(x - 65, 240, 140, 170);
          for (let row = 0; row < 3; row++)
            for (let col = 0; col < 3; col++) {
              g.fillStyle = "#e4b96112";
              g.fillRect(x - 55 + col * 43, 250 + row * 52, 34, 42);
            }
        }
        for (const y of [440, 670, 920]) {
          g.fillStyle = "#a7b3a615";
          g.fillRect(0, y, deps.W, 12);
          g.fillStyle = "#15252c44";
          g.fillRect(0, y + 12, deps.W, 5);
        }
      } else if (arena.motif === "sun") {
        // An amber sun and distant wind-carved mesas.
        g.fillStyle = "#edbf7f35";
        g.beginPath();
        g.arc(960, 330, 145, 0, Math.PI * 2);
        g.fill();
        for (const x of [50, 470, 1230, 1650]) {
          polygon(
            [
              [x, 920],
              [x + 25, 640],
              [x + 75, 640],
              [x + 75, 590],
              [x + 170, 590],
              [x + 210, 920],
            ],
            "#593b4330",
          );
        }
      } else if (arena.motif === "ice") {
        for (const x of [80, 400, 1170, 1510]) {
          polygon(
            [
              [x, 940],
              [x + 160, 430],
              [x + 330, 940],
            ],
            "#7da5b31c",
          );
          polygon(
            [
              [x + 119, 560],
              [x + 160, 430],
              [x + 207, 570],
              [x + 161, 539],
            ],
            "#c4e8eb25",
          );
        }
      } else if (arena.motif === "crystal") {
        // Broken sky-temple columns, with floating amethyst shards.
        for (const x of [130, 410, 1430, 1710]) {
          g.fillStyle = "#a58fc21b";
          g.fillRect(x, 470, 48, 490);
          g.fillRect(x - 16, 450, 80, 22);
          g.fillRect(x - 8, 690, 64, 16);
        }
        for (const [x, y, h] of [
          [600, 310, 90],
          [960, 230, 130],
          [1320, 310, 90],
        ]) {
          polygon(
            [
              [x, y - h],
              [x + 35, y],
              [x, y + h],
              [x - 35, y],
            ],
            "#c4a6ec25",
          );
          polygon(
            [
              [x, y - h],
              [x + 35, y],
              [x, y + h],
            ],
            "#d9c6f01c",
          );
        }
      } else if (arena.motif === "forest") {
        // Tall, quiet conifers rise through layered green mist.
        for (const [x, h] of [
          [80, 460],
          [350, 650],
          [670, 470],
          [1100, 470],
          [1420, 650],
          [1690, 460],
        ]) {
          g.fillStyle = "#142e3438";
          g.fillRect(x + 70, 1010 - h, 20, h);
          for (let tier = 0; tier < 4; tier++) {
            const y = 1010 - h + tier * 85;
            polygon(
              [
                [x + 80, y - 100],
                [x + 180 + tier * 8, y + 120],
                [x - 20 - tier * 8, y + 120],
              ],
              "#183b3930",
            );
          }
        }
        for (const y of [460, 670, 850]) {
          g.fillStyle = "#b7c8a80a";
          g.fillRect(0, y, deps.W, 42);
        }
      } else if (arena.motif === "swamp") {
        for (const x of [70, 350, 1470, 1750]) {
          g.fillStyle = "#193e3f88";
          g.fillRect(x, 390, 32, 620);
          for (let j = 0; j < 5; j++) {
            g.fillStyle = j % 2 ? "#3a625b80" : "#234b4680";
            g.fillRect(x - 95 + j * 19, 370 + j * 28, 190 - j * 18, 45);
            g.fillStyle = "#73937955";
            g.fillRect(x - 65 + j * 35, 450 + j * 13, 5, 130 + j * 16);
          }
        }
        g.fillStyle = "#adc6a820";
        g.fillRect(0, 885, deps.W, 30);
        g.fillRect(0, 950, deps.W, 18);
      } else if (arena.motif === "volcano") {
        // A split volcanic crown and muted lava seams below the islands.
        polygon(
          [
            [580, 1000],
            [850, 485],
            [920, 520],
            [1000, 520],
            [1070, 485],
            [1340, 1000],
          ],
          "#211e2d60",
        );
        polygon(
          [
            [850, 485],
            [920, 520],
            [1000, 520],
            [1070, 485],
            [1020, 566],
            [902, 556],
          ],
          "#ed97652e",
        );
        polygon(
          [
            [955, 545],
            [982, 650],
            [950, 735],
            [1010, 840],
            [972, 820],
            [930, 730],
            [963, 642],
          ],
          "#e8825630",
        );
      }
    }
    function buildBackground(arena = deps.ARENAS[0]) {
      const gradient = bg.createLinearGradient(0, 0, 0, deps.H);
      gradient.addColorStop(0, arena.sky[0]);
      gradient.addColorStop(0.58, arena.sky[1]);
      gradient.addColorStop(1, arena.sky[2]);
      bg.fillStyle = gradient;
      bg.fillRect(0, 0, deps.W, deps.H);
      if (arena.motif === "moon") {
        // The hollow moon sits behind the islands.
        bg.fillStyle = "#d6bd9220";
        bg.beginPath();
        bg.arc(1525, 285, 115, 0, Math.PI * 2);
        bg.fill();
        bg.fillStyle = "#d6bd9230";
        bg.beginPath();
        bg.arc(1525, 285, 88, 0, Math.PI * 2);
        bg.fill();
        bg.fillStyle = "#192c40";
        bg.beginPath();
        bg.arc(1494, 262, 82, 0, Math.PI * 2);
        bg.fill();
      } else drawArenaSky(bg, arena);
      let seed = 173 + deps.ARENAS.indexOf(arena) * 317;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let i = 0; i < 145; i++) {
        bg.fillStyle = i % 5 === 0 ? "#e5c79770" : "#a6c6c434";
        const x = rand() * deps.W,
          y = 120 + rand() * 780;
        bg.fillRect(
          Math.round(x / 2) * 2,
          Math.round(y / 2) * 2,
          i % 9 === 0 ? 3 : 2,
          2,
        );
      }
      [
        [60, 380, 2],
        [680, 300, 1.4],
        [1320, 680, 2.4],
        [180, 840, 2.8],
        [910, 920, 1.8],
        [1690, 380, 1.8],
      ].forEach((p) => {
        if (!["ice", "factory"].includes(arena.motif))
          deps.pixelCloud(bg, ...p, "#8db9b30b");
      });
      // Distant mountains form a quiet silhouette below the flight space.
      for (let layer = 0; layer < 3; layer++) {
        bg.fillStyle = arena.mountains[layer];
        bg.beginPath();
        bg.moveTo(0, deps.H);
        for (let x = 0; x <= deps.W + 80; x += 80)
          bg.lineTo(
            x,
            820 +
              layer * 58 +
              Math.sin(x * 0.008 + layer * 5) * 65 +
              rand() * 45,
          );
        bg.lineTo(deps.W, deps.H);
        bg.fill();
      }
      for (const p of arena.platforms) {
        if (arena.motif === "factory") {
          bg.fillStyle = "#293942";
          bg.fillRect(p.x, p.y, p.w, p.ground ? 70 : deps.PLATFORM_DEPTH);
          bg.fillStyle = "#566b75";
          bg.fillRect(p.x + 2, p.y + 3, p.w - 4, deps.PLATFORM_DEPTH - 7);
          bg.fillStyle = "#a0b3ba";
          bg.fillRect(p.x, p.y, p.w, 3);
          for (let x = p.x + 12; x < p.x + p.w - 6; x += 56) {
            bg.fillStyle = "#263944";
            bg.fillRect(x, p.y + 13, 5, 5);
            bg.fillStyle = "#b5c4c8";
            bg.fillRect(x, p.y + 13, 3, 3);
          }
          continue;
        }
        const depth = p.ground ? 70 : deps.PLATFORM_DEPTH,
          x = p.x,
          y = p.y,
          w = p.w;
        bg.fillStyle = "#121e2d";
        bg.fillRect(x - 3, y + 4, w + 6, 14);
        bg.fillStyle = arena.rock;
        bg.beginPath();
        bg.moveTo(x, y + 6);
        bg.lineTo(x + w, y + 6);
        bg.lineTo(x + w - 19, y + depth - 6);
        bg.lineTo(x + w * 0.65, y + depth);
        bg.lineTo(x + w * 0.56, y + depth + 20);
        bg.lineTo(x + w * 0.45, y + depth + 6);
        bg.lineTo(x + 20, y + depth - 3);
        bg.closePath();
        bg.fill();
        bg.fillStyle = arena.top;
        bg.fillRect(x, y, w, 9);
        bg.fillStyle = arena.rim;
        bg.fillRect(x, y, w, 3);
        bg.fillStyle = arena.id === "hollow" ? "#b5ba88" : arena.accent;
        bg.fillRect(x + 8, y, w * 0.25, 2);
        for (let j = 0; j < w / 13; j++) {
          const rx = x + rand() * w;
          bg.fillStyle = rand() > 0.5 ? "#47514d" : "#283740";
          bg.fillRect(
            Math.floor(rx / 4) * 4,
            y + 12 + Math.floor((rand() * depth) / 4) * 4,
            8 + Math.floor(rand() * 4) * 4,
            4,
          );
        }
        if (!p.ground && arena.motif !== "factory")
          for (let j = 0; j < 3; j++) {
            const vx = x + 25 + rand() * (w - 50),
              len = 25 + rand() * 65;
            bg.fillStyle =
              arena.id === "hollow" ? "#4e6e64" : arena.accent + "70";
            bg.fillRect(Math.floor(vx / 2) * 2, y + 20, 2, len);
            for (let k = 8; k < len; k += 13)
              bg.fillRect(vx + (k % 2 ? -3 : 1), y + 20 + k, 4, 2);
          }
        if (!p.ground && arena.motif !== "factory") {
          bg.fillStyle = arena.accent;
          for (let j = 0; j < 4; j++) {
            const gx = x + 20 + rand() * (w - 40);
            bg.fillRect(gx, y - 5, 2, 5);
            bg.fillRect(gx - 3, y - 3, 8, 2);
          }
        }
      }
      if (arena.id === "crystal") {
        for (const p of arena.graves) {
          const gx = p.x;
          bg.fillStyle = "#252a38";
          bg.fillRect(gx - 10, p.y - 20, 20, 20);
          bg.fillRect(gx - 7, p.y - 24, 14, 4);
          bg.fillStyle = "#85828e";
          bg.fillRect(gx - 8, p.y - 19, 16, 18);
          bg.fillRect(gx - 5, p.y - 22, 10, 4);
          bg.fillStyle = "#424251";
          bg.fillRect(gx - 1, p.y - 17, 2, 11);
          bg.fillRect(gx - 4, p.y - 14, 8, 2);
          bg.fillStyle = "#62566b";
          bg.fillRect(gx - 14, p.y - 3, 28, 3);
        }
      }
    }
    function initialize() {
      background.width = deps.W;
      background.height = deps.H;
      buildBackground();
    }
    return { buildBackground, background, initialize };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
