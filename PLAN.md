# One Big Sky update

1. Replace seat cards with a controller-first shared 2×4 roster, numbered multi-player focus markers, enlarged mount art and four rider previews. A locks a choice; B undoes readiness; X/Y add/remove bots. All ready enables a separate confirmation, never auto-starts. Keyboard retains per-player controls, boost as cancel, Enter confirmation.
2. Add explicit mode selection and team assignment screen. Require a selected mode and at least one player on each team. Auto-balance bots after human team changes. Preserve controller disconnect, pause, rematch and menu reset behavior.
3. Rework Chirp from the provided heavy-browed, big-beaked drawing; keep speaking animation and event-only commentary. Safely color exact player-name references.
4. Add blue flying fish as eighth equal-physics mount, including dive art and flap audio.
5. Add mirrored swamp arena, small bottom banks, lethal water and telegraphed vertical piranha jumps. Keep hazards paused/reset with rounds; cover water crossing, protection and bot routes in tests.
6. Rename game-facing branding and internal identifiers to One Big Sky, keeping the featherfall repository URL. Simplify title footer to requested copyright.
7. Update regression tests for the intentionally changed lobby flow. Run complete checks, visually inspect screens/art/hazards, review and fix all findings. Save locally; pushing main remains pending explicit authorization from the preceding blocked push.

## Completion

Implemented all seven requested areas. Updated tests for the new flow and added swamp, commentary-color, bot-balance, keyboard-conflict and audio regressions. All 139 tests and syntax checks pass. Browser visual review confirmed title, roster, mode selection, portrait art and river hazards. Corrected water visibility, keyboard input overlap, sawblade water interaction and bot flap cadence during review. No known material implementation issue remains. Physical controller verification is still a user-side check; main-branch publishing remains pending explicit authorization.
