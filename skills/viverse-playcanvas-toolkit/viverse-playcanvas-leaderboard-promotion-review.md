# VIVERSE Leaderboard Promotion Review

Reference checklist: [viverse-playcanvas-leaderboard-ready-checklist.md](./viverse-playcanvas-leaderboard-ready-checklist.md)

## Review Summary

- Review date: 2026-05-12
- Reviewer: GitHub Copilot
- Decision: Ready To Promote

## Section A: Evidence Chain

- [x] The workflow still maps to a real repo-local leaderboard capability source, helper, or validator.
- [x] The workflow does not make any core promise that cannot be traced to a repo-local file, helper, contract, or real implementation surface.
- [x] The workflow does not rely on remote skill wording as the primary implementation proof.
- [x] The workflow can name which local artifact actually grounds score submit and bounded ranking readback shapes.

Assessment: pass.

Reason: the repo can now name a concrete local artifact boundary through [scripts/create-leaderboard-runtime-boundary.mjs](./scripts/create-leaderboard-runtime-boundary.mjs) and [scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template](./scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template). That boundary grounds score submit plus bounded top-entries and around-user/self-rank readback shapes through a compatible SDK adapter. The installer helper has also been corrected so its runtime block is refreshed into async `onReady()` rather than left in non-async `createQuest()`. Most importantly, the installed boundary has now been verified against a real runtime with a real app identity and leaderboard backend: `submitLeaderboardScore(55)` returned a structured `submitted` result, while `readLeaderboardTopEntries()` and `readLeaderboardSelfRank()` both returned structured `readback` results through `getLeaderboard()` with ranking rows.

## Section B: Scope Boundary

- [x] The supported scope is still limited to one score submit path plus one ranking readback shape.
- [x] Multi-board or multi-category orchestration is still explicitly out of scope.
- [x] Generic ranking UI architecture is still explicitly out of scope.
- [x] Leaderboard combined with unsupported storage flow is still explicitly out of scope.
- [x] Leaderboard combined with unsupported multiplayer orchestration is still explicitly out of scope.

Assessment: pass.

## Section C: User-Project Landing Surface

- [x] The workflow can name the intended user-project landing surface precisely.
- [x] The preferred landing surface remains the user's `scripts/index.mjs` or a clearly identified equivalent bootstrap file.
- [x] The workflow does not default to editing Toolkit authoring files in this repo for end-user leaderboard requests.
- [x] The workflow can explain what to ask for when the landing surface is unknown.

Assessment: pass.

## Section D: Input Contract And Stop Conditions

- [x] The workflow requires the project folder path before executable guidance.
- [x] The workflow requires the runtime bootstrap file path, or confirmation that the project uses `scripts/index.mjs`.
- [x] The workflow requires app identity readiness before executable guidance.
- [x] The workflow requires the Studio Meta Name, or an equivalent clearly labeled configuration input, before executable guidance.
- [x] The workflow stops if the project folder is unknown.
- [x] The workflow stops if the runtime bootstrap file is unknown.
- [x] The workflow stops if app identity or leaderboard Meta Name is unknown.
- [x] The workflow stops if the request expands into broader scoring architecture, storage, or multiplayer orchestration.

Assessment: pass.

## Section E: Validation Path

- [x] There is at least one cheap validation step that can confirm the repo-local leaderboard prerequisites still exist.
- [x] That validation step can be described in one sentence.
- [x] The workflow can distinguish pass and fail signals for the validation step.
- [x] The workflow does not rely only on descriptive prose without any falsifiable check.

Assessment: pass.

Reason: the repo now includes a real executable validator that checks project target, runtime entry, repo prerequisite surfaces, app identity, leaderboard Meta Name, and the first-version mode boundary. The executable artifact path has also been exercised end to end enough to prove that the installer can refresh a user project without leaving syntax-invalid `await` usage behind, and that the installed boundary can initialize, submit, and read rankings against a compatible SDK shape.

## Section F: Failure Shape

- [x] The workflow distinguishes missing information from unsupported workflow.
- [x] The workflow distinguishes missing prerequisite state from runtime failure.
- [x] The workflow does not collapse all failures into broad architecture advice.
- [x] The workflow uses plain-language failure wording for end users.

Assessment: pass.

## Section G: Example Or Grounding Artifact

- [x] A user-project example exists that shows the final leaderboard landing shape in practice.
- [x] A helper or validator exists that checks the project target and basic leaderboard prerequisites.

Assessment: pass.

Reason: the repo now includes both a real user-project example artifact in [viverse-playcanvas-leaderboard-user-project-example.md](./viverse-playcanvas-leaderboard-user-project-example.md) and a real executable validator in [scripts/validate-leaderboard-integration.mjs](./scripts/validate-leaderboard-integration.mjs).

## Section H: User-Facing Language

- [x] The workflow leads with plain language such as leaderboard, score, or ranking.
- [x] The workflow does not lead with raw file archaeology or maintainer-only governance language.
- [x] The workflow does not imply that the repo already has a formal leaderboard skill today.
- [x] The workflow keeps the user in the role of end user rather than repo maintainer.

Assessment: pass.

## Decision

Ready To Promote.

The leaderboard line is now much better bounded than before because the repo has:

- a skill review in [viverse-playcanvas-leaderboard-skill-review.md](./viverse-playcanvas-leaderboard-skill-review.md)
- a readiness bar in [viverse-playcanvas-leaderboard-readiness-spec.md](./viverse-playcanvas-leaderboard-readiness-spec.md)
- a candidate downstream contract in [viverse-playcanvas-leaderboard-integration-contract.md](./viverse-playcanvas-leaderboard-integration-contract.md)
- a real executable validator in [scripts/validate-leaderboard-integration.mjs](./scripts/validate-leaderboard-integration.mjs)
- a validator behavior spec in [viverse-playcanvas-leaderboard-validator-spec.md](./viverse-playcanvas-leaderboard-validator-spec.md)
- a real user-project example artifact in [viverse-playcanvas-leaderboard-user-project-example.md](./viverse-playcanvas-leaderboard-user-project-example.md)
- a real executable integration artifact installer in [scripts/create-leaderboard-runtime-boundary.mjs](./scripts/create-leaderboard-runtime-boundary.mjs)
- a real runtime boundary template in [scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template](./scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template)
- a corrected runtime injection path that refreshes the installed block into async `onReady()` instead of leaving `await` inside `createQuest()`
- a post-install smoke test result showing the installed boundary can initialize, submit, and read bounded rankings against a compatible SDK shape
- a runtime-auth smoke path that resolves AccountSystem credentials and builds a GameDashboard client from `window.viverseApp`

That is enough to keep the topic in formal supported workflow inventory, provided the user-facing skill stays inside the same first-version boundary.

## Residual Risk

The remaining risk is no longer lack of real-runtime proof.

The main remaining risk is regression: future SDK surface changes or installer refresh changes could break the bounded readback adapter or the runtime wiring that currently works.

The remaining scope risk is still the same first-version boundary risk as before: do not expand this proof into claims about multi-board orchestration, generic ranking UI architecture, storage coupling, or multiplayer coupling.

## Maintenance Rule

Keep the readiness and routing documents aligned with this result, and keep any bounded user-facing workflow entry inside the proven scope: install runtime boundary, submit score, read top entries, and read self rank for one app ID plus one leaderboard Meta Name.
