/* effects: presentation module. Dependencies: birds, broadcast, ctx, playerName, powerColor, sound, tone. */
(function (root) {
  "use strict";
  root.OneBigSkyUI ||= {};
  root.OneBigSkyUI.effects = function createEffects(state, deps) {
    function burst(x, y, color, count, force = 1) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2,
          speed = (35 + Math.random() * 190) * force;
        state.particles.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 40,
          life: 0.6 + Math.random() * 0.7,
          total: 1.3,
          color,
          size: 2 + Math.random() * 4,
          angle: a,
        });
      }
    }
    function drawFireball(x, y) {
      deps.ctx.fillStyle = "#ff6b3260";
      deps.ctx.beginPath();
      deps.ctx.arc(x, y, 17, 0, Math.PI * 2);
      deps.ctx.fill();
      deps.ctx.fillStyle = "#ff843d";
      deps.ctx.beginPath();
      deps.ctx.arc(x, y, 11, 0, Math.PI * 2);
      deps.ctx.fill();
      deps.ctx.fillStyle = "#fff4b0";
      deps.ctx.fillRect(x - 4, y - 5, 8, 9);
    }
    function drawSaw(x, y, angle, radius = 28) {
      deps.ctx.save();
      deps.ctx.translate(x, y);
      deps.ctx.rotate(angle);
      deps.ctx.beginPath();
      for (let i = 0; i < 48; i++) {
        const a = (i * Math.PI) / 24,
          r = i % 4 < 2 ? radius : radius * 0.7;
        if (!i) deps.ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else deps.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      deps.ctx.closePath();
      deps.ctx.fillStyle = "#d8e7ff";
      deps.ctx.fill();
      deps.ctx.strokeStyle = "#6b839f";
      deps.ctx.lineWidth = 3;
      deps.ctx.stroke();
      deps.ctx.fillStyle = "#31475e";
      deps.ctx.beginPath();
      deps.ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
      deps.ctx.fill();
      deps.ctx.restore();
    }
    function drawRocketPickup(x, y) {
      deps.ctx.save();
      deps.ctx.translate(x, y);
      deps.ctx.rotate(-0.35);
      deps.ctx.fillStyle = "#ff9658";
      deps.ctx.fillRect(-27, -3, 12, 6);
      deps.ctx.fillStyle = "#ffe8ac";
      deps.ctx.fillRect(-23, -2, 9, 4);
      deps.ctx.fillStyle = "#54758c";
      deps.ctx.fillRect(-15, -6, 5, 12);
      deps.ctx.fillStyle = "#d9f6ff";
      deps.ctx.fillRect(-10, -7, 22, 14);
      deps.ctx.fillStyle = "#73eaff";
      deps.ctx.fillRect(-8, 4, 20, 3);
      deps.ctx.fillStyle = "#ff9064";
      deps.ctx.fillRect(12, -5, 5, 10);
      deps.ctx.fillRect(17, -3, 4, 6);
      deps.ctx.fillRect(21, -1, 3, 2);
      deps.ctx.fillRect(-12, -13, 6, 6);
      deps.ctx.fillRect(-6, -10, 6, 3);
      deps.ctx.fillRect(-12, 7, 6, 6);
      deps.ctx.fillRect(-6, 7, 6, 3);
      deps.ctx.fillStyle = "#315d79";
      deps.ctx.fillRect(1, -4, 7, 7);
      deps.ctx.fillStyle = "#a7efff";
      deps.ctx.fillRect(2, -3, 3, 3);
      deps.ctx.restore();
    }
    function drawRocketExhaust(p, x) {
      deps.ctx.save();
      deps.ctx.translate(x, p.y);
      // The plume follows the mount's tail, including its nose-down dive pose.
      if (p.diving && !p.grounded) deps.ctx.rotate(Math.PI / 2);
      else deps.ctx.scale(p.facing, 1);
      const tail = p.diving && !p.grounded ? 20 : 23;
      const length =
        (p.boosting ? 42 : 26) +
        Math.floor(Math.sin(state.match.time * 36) * 5);
      deps.ctx.fillStyle = "#ed633d";
      deps.ctx.fillRect(-tail - length, -2, length, 4);
      deps.ctx.fillRect(-tail - length + 5, -4, length - 5, 8);
      deps.ctx.fillRect(-tail - length + 12, -6, length - 12, 12);
      deps.ctx.fillStyle = "#ffb94e";
      deps.ctx.fillRect(-tail - length + 9, -4, length - 7, 8);
      deps.ctx.fillStyle = "#fff0b0";
      deps.ctx.fillRect(-tail - 11, -2, 13, 4);
      deps.ctx.restore();
    }
    function processEvents() {
      for (const event of state.match.events) {
        const color =
          event.id !== undefined
            ? deps.birds[state.match.players[event.id].character].color
            : "#ffe9b4";
        if (event.type === "saw-clang") {
          burst(event.x, event.y, "#ffe4a0", 10, 0.35);
          deps.tone(180, 0.08, "square", 0.035, 60);
        }
        if (event.type === "piranha-pop") {
          burst(event.x, event.y, "#ffad62", 14, 0.6);
          burst(event.x, event.y, "#9be1d3", 8, 0.4);
          deps.sound.play("zombie-pop", 0);
        }
        if (event.type === "splash") {
          burst(event.x, event.y, "#9be1d3", 12, 0.4);
          deps.sound.play("splash");
        }
        if (event.type === "eruption-warning") {
          deps.broadcast.say(
            "The volcano has entered the match. Lovely. More hotheads.",
            {},
            1,
          );
        }
        if (event.type === "volcano-impact") {
          burst(event.x, event.y, "#ff9b45", 18, 0.7);
          burst(event.x, event.y, "#ffe8a0", 6, 0.4);
          deps.sound.play("zombie-pop", 1);
        }
        if (event.type === "snow-pop") {
          burst(event.x, event.y, "#e5f8ff", 22, 0.8);
          deps.sound.play("zombie-pop", 0);
        }
        if (event.type === "zombie-pop") {
          burst(event.x, event.y, "#e84b4b", 15, 0.7);
          burst(event.x, event.y, "#992e3c", 7, 0.5);
          deps.sound.play("zombie-pop", event.variant);
        }
        if (event.type === "death") {
          burst(event.x, event.y, color, 35, 1.5);
          burst(event.x, event.y, "#eee7d3", 10);
          deps.sound.play("death");
          const victim = state.match.players[event.id];
          const attacker = state.match.players[event.attackerId];
          if (attacker)
            deps.broadcast.say(
              event.eliminated ? "out" : "ko",
              {
                a: deps.playerName(attacker),
                v: deps.playerName(victim),
              },
              event.eliminated ? 2 : 1,
            );
          else
            deps.broadcast.say(
              event.cause === "factory"
                ? `${deps.playerName(victim)} ignored the safety briefing. There was a saw.`
                : event.cause === "snowball"
                  ? `${deps.playerName(victim)} lost a snowball fight. Against the entire snowball.`
                  : event.cause === "zombie"
                    ? `${deps.playerName(victim)} ${event.eliminated ? "is out. Outplayed by the dearly departed." : "loses a life to a zombie. Brains were clearly on the menu."}`
                    : event.cause === "water"
                      ? `${deps.playerName(victim)} went swimming. Bold choice. Terrible result.`
                      : event.cause === "piranha"
                        ? `${deps.playerName(victim)} is on the lunch menu. Finally, some recognition.`
                        : event.cause === "volcano"
                          ? `${deps.playerName(victim)} caught a fireball. With their face.`
                          : `${deps.playerName(victim)} ${event.eliminated ? "is out of the round!" : "loses a life. Tough landing!"}`,
              {},
              1,
            );
        }
        if (event.type === "spawn") {
          burst(event.x, event.y, "#fff1c8", 16, 0.4);
          deps.sound.play("spawn");
        }
        if (event.type === "flap") {
          burst(event.x, event.y + 8, color, 2, 0.15);
          deps.sound.play("flap", state.match.players[event.id].character);
        }
        if (event.type === "boost") {
          burst(event.x, event.y, color, 12, 0.5);
          deps.tone(170, 0.18, "triangle", 0.06, 650);
        }
        if (event.type === "dive") deps.tone(280, 0.14, "triangle", 0.04, 65);
        if (event.type === "step") deps.sound.play("step", event.foot);
        if (event.type === "bump") {
          burst(event.x, event.y, "#b6c2b2", 5, 0.3);
          deps.tone(110, 0.06, "triangle", 0.025, 65);
        }
        if (event.type === "clash") {
          burst(event.x, event.y, "#fff0c0", 9);
          deps.tone(380, 0.08);
        }
        if (event.type === "life") {
          burst(event.x, event.y, "#ffe6a0", 24);
          deps.broadcast.say(event.maxReached ? "capped" : "life", {
            a: deps.playerName(state.match.players[event.id]),
          });
          deps.tone(660, 0.35, "triangle", 0.07, 1320);
        }
        if (event.type === "power") {
          burst(event.x, event.y, deps.powerColor[event.kind], 28);
          deps.broadcast.say(event.kind, {
            a: deps.playerName(state.match.players[event.id]),
          });
          deps.tone(420, 0.35, "triangle", 0.06, 1300);
        }
        if (event.type === "power-appeared") {
          deps.tone(600, 0.25, "triangle", 0.04, 1000);
        }
        if (event.type === "pickup") {
          deps.tone(700, 0.3, "sine", 0.04, 1050);
        }
      }
      state.match.events.length = 0;
    }
    function sparkle(x, y, size, color) {
      deps.ctx.fillStyle = color;
      deps.ctx.fillRect(Math.round(x) - size, Math.round(y), size * 2 + 1, 2);
      deps.ctx.fillRect(Math.round(x), Math.round(y) - size, 2, size * 2 + 1);
    }

    return {
      drawFireball,
      drawSaw,
      drawRocketPickup,
      drawRocketExhaust,
      sparkle,
      processEvents,
    };
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
