/* renderer: presentation module. Dependencies: H, TEAMS, W, background, birds, ctx, drawBird, drawFireball, drawRocketExhaust, drawRocketPickup, drawSaw, drawZombie, playerName, powerColor, sparkle. */
(function (root) {
  "use strict";
  root.OneBigSkyUI ||= {};
  root.OneBigSkyUI.renderer = function createRenderer(state, deps) {
    function render(dt) {
      deps.ctx.clearRect(0, 0, deps.W, deps.H);
      deps.ctx.drawImage(deps.background, 0, 0);
      const active =
        state.match &&
        ["match", "countdown", "ending", "pause", "results"].includes(
          state.screen,
        );
      if (!active) {
        deps.ctx.fillStyle = "#0c15274a";
        deps.ctx.fillRect(0, 0, deps.W, deps.H);
        // Menu birds stay near the outer islands so the title has clear space.
        const positions = [
          [270, 232],
          [1630, 232],
          [535, 762],
          [1375, 762],
        ];
        if (state.screen === "menu")
          positions.forEach(([x, y], i) => {
            const flying = i < 2;
            deps.drawBird(
              deps.ctx,
              x + Math.sin(state.clock * 0.6 + i) * 30,
              y + (flying ? Math.sin(state.clock * 2 + i) * 10 : 0),
              i,
              i % 2 ? -1 : 1,
              flying && Math.sin(state.clock * 9 + i) > 0.2,
              !flying,
              1.75,
              state.clock,
            );
          });
        if (state.screen === "lobby") {
          deps.ctx.fillStyle = "#101b2b55";
          deps.ctx.fillRect(0, 100, deps.W, deps.H - 180);
        }
      } else {
        for (const saw of state.match.arena.saws || []) {
          deps.drawSaw(saw.x, saw.y, state.match.time * 7, saw.radius);
          deps.ctx.fillStyle = "#e3b955";
          deps.ctx.fillRect(saw.x - 4, saw.y - 4, 8, 8);
        }
        for (const y of state.match.yetis) {
          const emerging = y.age < 0.35;
          const burrowing = y.age > 1.65;
          const digging = emerging || burrowing;
          const digTime = emerging ? y.age : y.age - 1.65;
          const scoop = Math.floor(digTime * 24) % 4;
          const rise = emerging
            ? Math.min(1, 0.25 + (y.age / 0.35) * 0.75)
            : burrowing
              ? Math.max(0, 1 - (y.age - 1.65) / 0.65)
              : 1;
          // Open a little hollow; scooped snow piles up around its rim.
          deps.ctx.fillStyle = "#668a9e";
          deps.ctx.fillRect(y.x - 12, y.y - 2, 24, 3);

          deps.ctx.save();
          deps.ctx.beginPath();
          deps.ctx.rect(y.x - 65, y.y - 65, 130, 65);
          deps.ctx.clip();
          deps.ctx.translate(
            Math.round(y.x),
            Math.round(
              y.y + (1 - rise) * 34 - (digging ? [0, 2, 0, -1][scoop] : 0),
            ),
          );
          deps.ctx.scale(y.direction, 1);
          if (burrowing) {
            deps.ctx.rotate(0.18);
            deps.ctx.scale(1, 0.88);
          }
          // Small shaggy head, narrow body and skinny arms for the shove.
          deps.ctx.fillStyle = "#b4d5e4";
          deps.ctx.fillRect(-8, -22, 16, 19);
          deps.ctx.fillStyle = "#edfaff";
          deps.ctx.fillRect(-10, -30, 20, 15);
          deps.ctx.fillRect(-7, -33, 3, 5);
          deps.ctx.fillRect(5, -33, 3, 5);
          deps.ctx.fillRect(-6, -18, 13, 14);
          deps.ctx.fillRect(-9, -4, 7, 4);
          deps.ctx.fillRect(4, -4, 7, 4);
          if (!digging) deps.ctx.fillRect(-12, -19, 4, 11);
          deps.ctx.fillStyle = "#6b9eb9";
          deps.ctx.fillRect(-3, -27, 13, 9);
          deps.ctx.fillStyle = "#152e49";
          deps.ctx.fillRect(-1, -25, 2, 3);
          deps.ctx.fillRect(6, -25, 2, 3);
          deps.ctx.fillRect(2, -20, 5, 2);
          deps.ctx.fillStyle = "#edfaff";
          if (digging) {
            // Alternating hands: reach into the snow, scoop, then fling it outward.
            for (const side of [-1, 1]) {
              const phase = (scoop + (side < 0 ? 2 : 0)) % 4;
              const handX = [12, 10, 18, 21][phase] * side;
              const handY = [-5, -12, -22, -15][phase];
              deps.ctx.fillStyle = "#b4d5e4";
              deps.ctx.fillRect(
                side < 0 ? handX : 7,
                -17,
                Math.abs(handX) - 5,
                4,
              );
              deps.ctx.fillRect(
                handX,
                Math.min(-15, handY),
                3,
                Math.abs(handY + 15) + 3,
              );
              deps.ctx.fillStyle = "#edfaff";
              deps.ctx.fillRect(handX - 2, handY - 1, 6, 4);
            }
          } else deps.ctx.fillRect(6, -16, y.pushed ? 15 : 8, 4);
          deps.ctx.restore();
          if (digging) {
            for (let i = 0; i < 8; i++) {
              const flight = (((digTime * 3 + i / 8) % 1) + 1) % 1;
              const side = i % 2 ? 1 : -1;
              deps.ctx.fillStyle = i % 3 ? "#e4f8ff" : "#a7cedf";
              deps.ctx.globalAlpha = 1 - flight;
              deps.ctx.fillRect(
                Math.round(y.x + side * (10 + flight * (22 + i))),
                Math.round(y.y - 3 - Math.sin(flight * Math.PI) * (10 + i * 2)),
                (i % 3) + 2,
                3,
              );
            }
            deps.ctx.globalAlpha = 1;
          }
          deps.ctx.fillStyle = "#e4f8ff";
          deps.ctx.fillRect(y.x - 19, y.y - 3, 10, 3);
          deps.ctx.fillRect(y.x + 9, y.y - 3, 10, 3);
          deps.ctx.fillRect(y.x - 15, y.y - 5, 5, 2);
          deps.ctx.fillRect(y.x + 11, y.y - 5, 5, 2);
          if (y.age > 2.2) deps.ctx.fillRect(y.x - 12, y.y - 2, 24, 2);
        }
        for (const b of state.match.snowballs) {
          for (const offset of [
            0,
            ...(b.x < 28 ? [deps.W] : b.x > deps.W - 28 ? [-deps.W] : []),
          ]) {
            deps.ctx.save();
            deps.ctx.translate(Math.round(b.x + offset), Math.round(b.y));
            // Two-pixel rows trace a circle instead of broad octagonal corners.
            for (let row = -25; row < 25; row += 2) {
              const half = Math.round(Math.sqrt(625 - (row + 1) ** 2));
              deps.ctx.fillStyle = "#9bbfd5";
              deps.ctx.fillRect(-half, row, half * 2, 2);
              const innerY = row + 4;
              if (Math.abs(innerY) < 21) {
                const light = Math.round(Math.sqrt(441 - innerY ** 2));
                deps.ctx.fillStyle = "#edfaff";
                deps.ctx.fillRect(
                  Math.max(-half, -light - 3),
                  row,
                  Math.min(light * 2, half * 2 - 3),
                  2,
                );
              }
            }
            deps.ctx.rotate(b.angle);
            deps.ctx.fillStyle = "#c0dfed";
            deps.ctx.fillRect(-11, -15, 8, 5);
            deps.ctx.fillRect(8, 7, 6, 8);
            deps.ctx.restore();
          }
        }
        if (state.match.arena.waterY !== undefined) {
          const y = state.match.arena.waterY;
          deps.ctx.fillStyle = "#245d65";
          deps.ctx.fillRect(210, y, deps.W - 420, deps.H - y);
          deps.ctx.fillStyle = "#8dc9b5";
          deps.ctx.fillRect(210, y, deps.W - 420, 3);
          for (let i = 0; i < 20; i++) {
            deps.ctx.fillStyle = "#6faea277";
            deps.ctx.fillRect(
              230 + i * 75 + Math.sin(state.match.time * 2 + i) * 8,
              y + 10 + (i % 3) * 12,
              30,
              2,
            );
          }
          for (const f of state.match.piranhas) {
            if (f.warning > 0) {
              deps.ctx.strokeStyle = "#dfedb0";
              deps.ctx.lineWidth = 2;
              deps.ctx.beginPath();
              deps.ctx.ellipse(
                f.x,
                y - 2,
                12 + Math.max(0, 1 - f.warning / 0.3) * 16,
                3,
                0,
                0,
                Math.PI * 2,
              );
              deps.ctx.stroke();
              continue;
            }
            deps.ctx.save();
            deps.ctx.translate(Math.round(f.x), Math.round(f.y));
            if (f.vy > 0) deps.ctx.rotate(Math.PI);
            deps.ctx.fillStyle = "#315248";
            deps.ctx.fillRect(-9, -11, 18, 22);
            deps.ctx.fillStyle = "#9cc071";
            deps.ctx.fillRect(-7, -13, 14, 18);
            deps.ctx.fillStyle = "#d37c59";
            deps.ctx.fillRect(-5, -14, 10, 6);
            deps.ctx.fillStyle = "#fff1c9";
            deps.ctx.fillRect(-5, -15, 3, 4);
            deps.ctx.fillRect(2, -15, 3, 4);
            deps.ctx.fillStyle = "#132f35";
            deps.ctx.fillRect(-5, -5, 3, 3);
            deps.ctx.fillRect(3, -5, 3, 3);
            deps.ctx.fillStyle = "#769857";
            deps.ctx.fillRect(-7, 10, 5, 7);
            deps.ctx.fillRect(2, 10, 5, 7);
            deps.ctx.restore();
          }
        }
        if (state.match.eruption) {
          const warningAge = state.match.time - state.match.eruption.start;
          if (warningAge < 1.2) {
            deps.ctx.fillStyle = `rgba(255, 185, 100, ${0.24 * Math.max(0, 1 - warningAge / 1.2)})`;
            deps.ctx.fillRect(0, 0, deps.W, deps.H);
          }
        }
        for (const f of state.match.volcanoFireballs) {
          deps.ctx.fillStyle = "#ff803e80";
          deps.ctx.fillRect(f.x - 5, f.y - 27, 10, 22);
          deps.drawFireball(f.x, f.y);
        }
        for (const z of state.match.zombies) {
          deps.drawZombie(deps.ctx, z, state.match.time);
          if (z.x < 18)
            deps.drawZombie(
              deps.ctx,
              { ...z, x: z.x + deps.W },
              state.match.time,
            );
          if (z.x > deps.W - 18)
            deps.drawZombie(
              deps.ctx,
              { ...z, x: z.x - deps.W },
              state.match.time,
            );
        }
        if (state.match.pickup) {
          const p = state.match.pickup,
            y = p.y + Math.sin(state.clock * 4) * 4;
          const glow = deps.ctx.createRadialGradient(p.x, y, 2, p.x, y, 44);
          glow.addColorStop(0, "#ffe7a340");
          glow.addColorStop(1, "#ffe7a300");
          deps.ctx.fillStyle = glow;
          deps.ctx.fillRect(p.x - 44, y - 44, 88, 88);
          if (p.ttl > 3 || Math.sin(state.clock * 14) > 0) {
            deps.ctx.save();
            deps.ctx.translate(p.x, y);
            deps.ctx.rotate(0.5);
            deps.ctx.fillStyle = "#f9d67e";
            deps.ctx.fillRect(-4, -12, 8, 20);
            deps.ctx.fillStyle = "#fff0bf";
            deps.ctx.fillRect(-1, -14, 3, 29);
            deps.ctx.fillStyle = "#b48c51";
            deps.ctx.fillRect(-4, 4, 3, 6);
            deps.ctx.restore();
            deps.sparkle(p.x + 18, y - 12, 3, "#ffeac1");
          }
        }
        if (state.match.powerPickup) {
          const p = state.match.powerPickup,
            y = p.y + Math.sin(state.clock * 4) * 4;
          if (p.ttl > 3 || Math.sin(state.clock * 14) > 0) {
            const glow = deps.ctx.createRadialGradient(p.x, y, 2, p.x, y, 44);
            glow.addColorStop(0, deps.powerColor[p.kind] + "40");
            glow.addColorStop(1, deps.powerColor[p.kind] + "00");
            deps.ctx.fillStyle = glow;
            deps.ctx.fillRect(p.x - 44, y - 44, 88, 88);
            if (p.kind === "flame") deps.drawFireball(p.x, y);
            else if (p.kind === "sawblade")
              deps.drawSaw(p.x, y, state.clock * 6, 20);
            else deps.drawRocketPickup(p.x, y);
          }
        }
        for (const f of state.match.projectiles) deps.drawFireball(f.x, f.y);
        for (const p of state.match.players) {
          if (!p.alive) {
            if (p.lives > 0) {
              deps.ctx.fillStyle = "#c9d6cd70";
              deps.ctx.font = "14px Silkscreen";
              deps.ctx.textAlign = "center";
              deps.ctx.fillText(`${Math.ceil(p.respawn)}`, p.x, p.y - 30);
            }
            continue;
          }
          const b = deps.birds[p.character];
          if (p.boosting) {
            deps.ctx.fillStyle = b.color + "88";
            deps.ctx.fillRect(p.x - p.facing * 47, p.y - 5, 25, 3);
            deps.ctx.fillRect(p.x - p.facing * 38, p.y + 2, 16, 2);
          }
          if (p.grounded) {
            deps.ctx.fillStyle = "#0a132b55";
            deps.ctx.fillRect(p.x - 17, p.y + 11, 34, 3);
          }
          for (const offset of [
            0,
            ...(p.x < 85 ? [deps.W] : p.x > deps.W - 85 ? [-deps.W] : []),
          ]) {
            const x = p.x + offset;
            if (p.boostReadyGlow > 0) {
              const progress = 1 - p.boostReadyGlow / 0.5;
              const pulse = Math.sin(progress * Math.PI);
              deps.ctx.save();
              deps.ctx.globalAlpha = pulse * 0.75;
              const glow = deps.ctx.createRadialGradient(
                x,
                p.y - 8,
                5,
                x,
                p.y - 8,
                48,
              );
              glow.addColorStop(0, "#fff9df");
              glow.addColorStop(0.35, b.color);
              glow.addColorStop(1, b.color + "00");
              deps.ctx.fillStyle = glow;
              deps.ctx.fillRect(x - 48, p.y - 56, 96, 96);
              for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI) / 2 + Math.PI / 4;
                deps.sparkle(
                  x + Math.cos(angle) * (25 + progress * 15),
                  p.y - 8 + Math.sin(angle) * (25 + progress * 15),
                  2,
                  "#fff9df",
                );
              }
              deps.ctx.restore();
            }
            if (p.power === "rocket") deps.drawRocketExhaust(p, x);
            if (p.power === "sawblade")
              deps.drawSaw(x, p.y, state.match.time * 32);
            else
              deps.drawBird(
                deps.ctx,
                x,
                p.y,
                p.character,
                p.facing,
                p.flapTimer > 0,
                p.grounded,
                1,
                p.diving && !p.grounded
                  ? state.match.time
                  : Math.abs(p.vx) > 15
                    ? state.clock
                    : 0,
                p.diving && !p.grounded,
              );
            if (p.power === "flame")
              for (const f of state.match.fireballs(p))
                deps.drawFireball(f.x + offset, f.y);
            deps.ctx.font = "bold 14px Silkscreen";
            deps.ctx.textAlign = "center";
            deps.ctx.fillStyle = b.color;
            const nameOffset =
              p.power === "rocket" && p.diving && !p.grounded ? 70 : 34;
            deps.ctx.fillText(deps.playerName(p), x, p.y - nameOffset);
            if (state.mode === "teams") {
              deps.ctx.fillStyle = deps.TEAMS[p.team].color;
              deps.ctx.font = "12px Silkscreen";
              deps.ctx.fillText(
                deps.TEAMS[p.team].name,
                x,
                p.y - nameOffset - 16,
              );
            }
            if (p.invincible > 0) {
              deps.ctx.strokeStyle = "#fff0c677";
              deps.ctx.lineWidth = 1;
              deps.ctx.beginPath();
              deps.ctx.ellipse(x, p.y - 4, 29, 30, 0, 0, Math.PI * 2);
              deps.ctx.stroke();
              for (let i = 0; i < 5; i++) {
                const a = state.clock * 3 + (i * Math.PI * 2) / 5;
                deps.sparkle(
                  x + Math.cos(a) * 29,
                  p.y - 4 + Math.sin(a) * 30,
                  2,
                  "#fff0c6",
                );
              }
            }
          }
        }
      }
      if (state.screen !== "pause")
        for (const p of state.particles) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 180 * dt;
          p.angle += dt * 5;
        }
      state.particles = state.particles.filter((p) => p.life > 0);
      for (const p of state.particles) {
        deps.ctx.save();
        deps.ctx.globalAlpha = Math.min(1, p.life * 2);
        deps.ctx.translate(p.x, p.y);
        deps.ctx.rotate(p.angle);
        deps.ctx.fillStyle = p.color;
        deps.ctx.fillRect(-p.size, -1, p.size * 2, 3);
        deps.ctx.restore();
      }
      // Soft scanlines, kept faint enough for small characters to remain legible.
      deps.ctx.fillStyle = "#050d180d";
      for (let y = 0; y < deps.H; y += 4) deps.ctx.fillRect(0, y, deps.W, 1);
    }

    return { render };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
