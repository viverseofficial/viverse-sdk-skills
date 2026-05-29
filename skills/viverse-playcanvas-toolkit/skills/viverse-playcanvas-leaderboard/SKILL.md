---
name: viverse-playcanvas-leaderboard
description: "Help a user integrate a grounded VIVERSE leaderboard into a local world project with one app ID, one leaderboard Studio Meta Name, score submit, and bounded ranking readback."
argument-hint: "Describe your project folder, your app ID, and your leaderboard Studio Meta Name if you already know it."
---

# VIVERSE PlayCanvas Leaderboard

## What This Skill Does

This skill is for a narrow leaderboard request in a user-owned local project.

Use it only when the user wants one of these outcomes:

- submit a score to one leaderboard
- read top leaderboard entries
- read the current user's rank or around-user ranking

Treat the user as the end user of the workflow by default.

Do not reinterpret a direct invocation as a request to maintain `skills`, `prompts`, or repo memory unless the user explicitly asks for customization maintenance.

This skill is not for generic backend design.

## Supported Boundary

Do not treat this skill as proof that the repo already supports:

- multi-board orchestration
- generic ranking UI architecture
- leaderboard plus storage workflow guarantees
- leaderboard plus unsupported multiplayer orchestration
- arbitrary backend design beyond the current runtime boundary

If the user's request depends on any of those, stop and say that the request goes beyond the current leaderboard workflow scope.

## Grounded Capability Sources

This skill is grounded in these repo-local sources:

- [scripts/create-leaderboard-runtime-boundary.mjs](../../../scripts/create-leaderboard-runtime-boundary.mjs)
- [scripts/utils/resolve-runtime-entry.mjs](../../../scripts/utils/resolve-runtime-entry.mjs)
- [scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template](../../../scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template)
- [scripts/validate-leaderboard-integration.mjs](../../../scripts/validate-leaderboard-integration.mjs)
- [viverse-playcanvas-leaderboard-integration-contract.md](../../../viverse-playcanvas-leaderboard-integration-contract.md)
- [viverse-playcanvas-leaderboard-promotion-review.md](../../../viverse-playcanvas-leaderboard-promotion-review.md)
- [viverse-playcanvas-leaderboard-real-runtime-test.md](../../../viverse-playcanvas-leaderboard-real-runtime-test.md)

Do not promise behavior beyond what those sources can support.

Treat those grounded sources and the current Toolkit skill workspace as an explicit allowed exception to target-folder-only implementation search. You may consult or execute this workspace's `skills/`, `prompts/`, `docs/`, `scripts/`, `packages/`, catalog, contract, checklist, and review files when they are the grounded helper surface for the requested leaderboard workflow. This exception does not authorize inspecting other sibling user project folders outside this workspace.

## When To Use This Skill

Use this skill when all of these are true:

1. The user is asking about a local world project, not Toolkit internal maintenance.
2. The user wants one leaderboard integration for one app ID and one leaderboard Studio Meta Name.
3. The request can stay within score submit plus bounded ranking readback.
4. The implementation target is the user's project runtime bootstrap. The default expected entry is `scripts/index.mjs` for PlayCanvas Editor-exported projects, **and** `main.js` (or whatever single JS entry the `index.html` loads) for engine-only local worlds scaffolded by [viverse-engine-only-local-world](../viverse-engine-only-local-world/SKILL.md).

If the target project is missing, ask for the local project folder before discussing implementation details.

For engine-only local worlds, prefer the existing folder helpers first:

- [scripts/create-engine-only-world.mjs](../../../scripts/create-engine-only-world.mjs) for the starter world shape
- [scripts/validate-engine-only-world.mjs](../../../scripts/validate-engine-only-world.mjs) before wiring leaderboard support

Do not ask the user to name `main.js` if `index.html` already exists. The current leaderboard installer and validator can detect the local world script from `index.html` automatically.

## Preservation Rules

When adding leaderboard support into an already working world, treat the current local behavior as a preservation baseline.

Do not use leaderboard integration as permission to rewrite the world's bootstrap, UI flow, quest flow, interaction flow, or other existing runtime wiring.

Use one small additive integration point instead of a fresh unified architecture.

Keep the current local path working unless the user explicitly asks to replace it.

If leaderboard support introduces a prerequisite such as app identity, sign-in, or leaderboard configuration readiness, gate that path before enabling it.

Do not let a missing leaderboard prerequisite break an existing local path that already worked.

Before claiming completion, name at least one existing behavior that must still work after the edit and verify that preserved behavior in addition to the new leaderboard path.

Four-rule hard-stop wording:

1. Do not rewrite a working world to add leaderboard support.
2. Keep the existing local path working until the leaderboard path is proven ready.
3. Gate app ID, sign-in, and other leaderboard prerequisites before turning the new path on.
4. Do not claim completion until one old behavior and one new leaderboard behavior both work.

Environment-mode rules for this workflow:

1. Treat local localhost preview and VIVERSE preview or published runtime as different validation modes.
2. In local localhost preview, validate only local wiring such as completion hooks, score payload construction, and UI state; do not claim that real leaderboard submit or readback is proven there unless a compatible runtime client is directly confirmed.
3. In VIVERSE preview or published runtime, validate the real submit and readback consumers directly before claiming leaderboard functionality works.
4. Do not wait for a score-submit call to fail before checking capability; determine whether a compatible submit or readback client exists before promising real leaderboard runtime behavior.

## When Not To Use This Skill

Do not use this skill when the user wants:

- multi-board or category orchestration
- a fully custom ranking UI system
- leaderboard plus unsupported storage design
- leaderboard plus unsupported multiplayer guarantees
- a generic design document for all leaderboard architectures

In those cases, explain that the current leaderboard workflow boundary is narrower than the request.

## Language Rules

- Prefer "your project folder" before repo-oriented language.
- Prefer "leaderboard", "score", and "ranking" before internal helper names.
- Do not lead with repo internals or source file names unless the user asks for implementation details.
- Do not ask the user to compare integration routes, runtime-entry patterns, or Toolkit wiring choices. Determine those yourself.
- If the target project's own files identify the main world script unambiguously, infer it and continue instead of asking the user to name files.
- If the only remaining blocker is an app ID or leaderboard Studio Meta Name, ask only for that business configuration, not for extra implementation detail.
- If the user gives too little detail, do not stop at a vague request. Ask one short practical question and include a short English fill-in template.
- Do not imply that generic leaderboard support is solved just because the runtime boundary now works.

## Required Inputs

Before giving executable guidance, collect all of these and infer them only when the target project's own files identify them safely:

1. Project folder path
2. Runtime bootstrap file path only when it cannot be inferred safely from the project
3. App ID
4. Leaderboard Studio Meta Name, which the code will use as the leaderboard key

For engine-only local worlds, detect the entry file by reading the `<script>` tags in `index.html` instead of asking the user to name the file.

For Editor-exported projects, use the conventional `scripts/index.mjs` path unless the target project's own files show a different bootstrap.

If the project already has `index.html`, use the built-in detection in [scripts/create-leaderboard-runtime-boundary.mjs](../../../scripts/create-leaderboard-runtime-boundary.mjs) and [scripts/validate-leaderboard-integration.mjs](../../../scripts/validate-leaderboard-integration.mjs) rather than manually asking the user for the main world script filename.

Preferred plain-language collection shape when details are actually missing:

`Project folder: /absolute/path App ID: your app id Leaderboard Meta Name: your Studio Meta Name`

If the project folder is unknown, stop and ask for it.

If the main world script cannot be inferred safely, stop and ask for it.

If the app ID or leaderboard Meta Name is unknown, stop and ask for it.

## Missing Input Recovery

When the project target is known but the user does not yet know the app ID or leaderboard Meta Name, give bounded prerequisite guidance instead of stopping with a vague request.

### How To Confirm App ID

Use only these grounded paths:

1. In VIVERSE Studio, open the user's world and check the Overview tab, where the world page shows the App ID.
2. If the user is already using the VIVERSE CLI, they can run `viverse-cli app list` to see existing application IDs.
3. If the user is creating a new world in Studio, the App ID appears on the world page after the world is created.

Do not invent other hidden Toolkit-specific sources of truth for the production app ID.

If the app ID is the only remaining blocker and the user does not yet have a target world or app, ask one short practical question about whether they want to create or publish that target now in order to obtain the app ID.

If they do want to create or publish it now, reroute to [viverse-cli-publish](../viverse-cli-publish/SKILL.md) as the preferred path so the agent can create the target app and obtain the app ID directly; use direct Studio creation only when the CLI publish path is unavailable or the user explicitly wants the Studio path.

Do not turn missing app ID into an open-ended workflow discussion. Only offer the publish or create-world path when app identity is the actual blocker.

### How To Confirm Leaderboard Meta Name And Display Name

Use only this grounded Studio path:

1. Open VIVERSE Studio.
2. Go to the Upload section and open the world to edit.
3. Choose Upload Content for that world.
4. Open the SDK Settings tab.
5. Add or inspect the leaderboard in the leaderboard configuration area.
6. If the leaderboard does not exist yet, fill in both Studio fields: Display Name for the user-facing label and Meta Name for the value the code will use as the leaderboard key.
7. Use the Studio Meta Name as the SDK `name` value for score upload and ranking readback. Treat the Display Name as a separate UI label.
8. The Studio Meta Name may contain only letters, numbers, and `~@$-,.`. Do not suggest underscores such as `gate_speed_run`.

Do not describe the Studio Meta Name as something the Toolkit can derive locally from project files.

Do not tell the user to look for a field literally called "leaderboard key" in Studio when the UI shows Meta Name instead.

Do not imply that the user can continue without first creating or confirming that leaderboard configuration in Studio.

If the user says they have no leaderboard yet, explain that they must first create the leaderboard configuration in Studio before this workflow can wire score submit or readback against it.

## Supported Output Shape

When using this skill, return:

1. a plain-language statement that this is a leaderboard request
2. one short reason this bounded path fits
3. a plain-language description of the repo capability that exists today
4. the immediate missing detail needed before implementation can proceed
5. one stop note if the user's request exceeds the current leaderboard boundary

## Short Reply Template

When the request clearly fits this skill, prefer a short reply shape like this before adding implementation detail:

1. best path: "This is mainly a leaderboard request for one app ID and one leaderboard Meta Name."
2. why it fits: mention score submit, top entries, or self-rank in one local world project
3. toolkit support shape: mention the grounded runtime boundary in plain language
4. immediate next action: ask for the project folder and any missing leaderboard Meta Name, and when app identity is the only blocker with no target world yet, ask whether the user wants to create or publish that target now through the preferred CLI publish path; ask about the main world script only when it cannot be inferred

Example opening:

"This is mainly a leaderboard request for one world. The toolkit now has a grounded path for score submit plus bounded ranking readback, and once I have your project folder plus the App ID and Studio Meta Name for that leaderboard, I can wire it in. If app identity is the only blocker and you do not yet have a target world, I can also help create or publish that target first so we can obtain the app ID."

When the user asks where to find the app ID or leaderboard Meta Name, prefer a short answer shape like this before adding more detail:

"You can confirm the App ID in VIVERSE Studio by opening your world and checking the Overview tab. If you do not have a target world yet and app identity is the main blocker, I can also help create or publish that target first through the CLI path so we can obtain the app ID. For the leaderboard setup, open that same world's Upload Content page, go to SDK Settings, and inspect or create the leaderboard there. Studio asks for both Display Name and Meta Name. The Meta Name is the value the code will use as the leaderboard key, and the Display Name stays as the user-facing label. The Meta Name may contain only letters, numbers, and ~@$-,., so do not use underscores. Once you have those values and your project folder, I can wire the leaderboard into your world."

## Preferred Opening

Use an opening shape like this when it fits:

"This is mainly a leaderboard request. The toolkit now has a grounded path for one app ID plus one leaderboard Meta Name, and once I have your project folder plus any missing prerequisite values, I can wire it into your world. If app identity is the only blocker and you do not yet have a target world, I can help create or publish that target first so we can obtain the app ID."

## Stop Conditions

Stop and ask or reroute when any of these are true:

1. The project folder is unknown.
2. The main world script cannot be inferred from the project.
3. The app ID is unknown.
4. The leaderboard Meta Name is unknown.
5. The request is broader than one submit path plus bounded top-entries or self-rank readback.
6. The request depends on multi-board orchestration, generic ranking UI architecture, storage coupling, or unsupported multiplayer coupling.

## Guardrails

1. Do not present the current runtime boundary as proof that generic leaderboard support is complete.
2. Do not invent unsupported backend workflows or extra readback guarantees.
3. Do not proceed with implementation planning until the user-project target is known.
4. Do not widen scope beyond one app ID plus one leaderboard Meta Name.
5. Do not rewrite a working world just to add leaderboard support.
6. Do not let a missing leaderboard prerequisite break an existing local path that already worked.
7. Do not claim completion until one preserved local behavior and one new leaderboard behavior both work.

## Validation Path

Before treating this path as grounded, validate at least one of these facts:

1. [scripts/validate-leaderboard-integration.mjs](../../../scripts/validate-leaderboard-integration.mjs) still exists and checks project target, app ID, and the leaderboard Studio Meta Name used at runtime.
2. [scripts/create-leaderboard-runtime-boundary.mjs](../../../scripts/create-leaderboard-runtime-boundary.mjs) still installs the runtime boundary into a user project and can auto-detect the engine-only main world script from `index.html`.
3. [scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template](../../../scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template) still exposes submit, top-entries readback, and self-rank readback.
4. [viverse-playcanvas-leaderboard-real-runtime-test.md](../../../viverse-playcanvas-leaderboard-real-runtime-test.md) still records a real-runtime pass for submit and bounded readback.

If none of those checks can be confirmed, do not present this skill as grounded workflow support.

When the target world already worked before the edit, require at least one preserved-behavior validation step in addition to any new leaderboard validation before claiming completion.

When leaderboard runtime wiring is added, require one environment-mode check before claiming real submit or readback support:

1. local localhost preview proves only local timing, hooks, payload construction, and UI unless a compatible submit or readback client is directly present
2. VIVERSE preview or published runtime must prove the actual submit or readback client exists and is callable before claiming real leaderboard functionality

## Failure Shape

- Missing information: infer the runtime bootstrap file only when the target project's own files identify it safely, then ask only for the project folder, app ID, and leaderboard Meta Name that are still missing.
- Supported capability but unclear landing point: explain that the repo has a grounded leaderboard path, but the project integration target must be confirmed first.
- Missing app ID or leaderboard Meta Name: explain the bounded prerequisite recovery path; if app identity is the only blocker and no target world exists yet, ask whether the user wants to create or publish that target now through the preferred CLI publish path, otherwise stop until the missing values are known.
- Unsupported workflow: explain that the request goes beyond the current one-board leaderboard boundary.
- Runtime problem after integration begins: debug only after the project target, app ID, and leaderboard Meta Name are known.

## Immediate Next Action

If the request clearly fits this skill and required inputs are missing, the immediate next action should be one short question asking for:

- the local project folder path
- the app ID
- the leaderboard Studio Meta Name

Ask for the runtime bootstrap file only if it cannot be inferred from the project structure.
