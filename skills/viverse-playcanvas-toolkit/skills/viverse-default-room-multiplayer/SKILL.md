---
name: viverse-default-room-multiplayer
description: 'Help a user integrate low-risk default-room multiplayer into a local VIVERSE world project without implying generic multiplayer support.'
argument-hint: 'Describe your local project folder and whether you only need default-room shared presence or synchronized interactions.'
---

# VIVERSE Default-Room Multiplayer

## What This Skill Does

This skill is for a narrow multiplayer request in a user-owned local project.

Use it only when the user wants one of these outcomes:

- shared player presence in the default room
- package-level synchronized interactions in the default room

Treat the user as the end user of the workflow by default.

Do not reinterpret a direct invocation as a request to maintain `skills`, `prompts`, or repo memory unless the user explicitly asks for customization maintenance.

This skill is not for generic multiplayer design.

## Supported Boundary

Do not treat this skill as proof that the repo already supports:

- named rooms
- matchmaking
- room discovery UI
- host-authoritative gameplay architecture
- late-join recovery for custom user-defined state

If the user's request depends on any of those, stop and say that the request goes beyond the current default-room multiplayer scope.

## Grounded Capability Sources

This skill is grounded in these repo-local sources:

- [packages/network/guide.md](../../../packages/network/guide.md)
- [packages/network/src/index.ts](../../../packages/network/src/index.ts)
- [packages/network/src/NetworkSystem.ts](../../../packages/network/src/NetworkSystem.ts)
- [packages/network/src/modules/multiplayer/MultiplayerModule.ts](../../../packages/network/src/modules/multiplayer/MultiplayerModule.ts)
- [toolkit-capability-catalog.md](../../toolkit-capability-catalog.md)
- [viverse-default-room-multiplayer-contract.md](../../../viverse-default-room-multiplayer-contract.md)
- [scripts/validate-default-room-multiplayer.mjs](../../../scripts/validate-default-room-multiplayer.mjs)

Do not promise behavior beyond what those sources can support.

Treat those grounded sources and the current Toolkit skill workspace as an explicit allowed exception to target-folder-only implementation search. You may consult or execute this workspace's `skills/`, `prompts/`, `docs/`, `scripts/`, `packages/`, catalog, contract, checklist, and review files when they are the grounded helper surface for the requested multiplayer workflow. This exception does not authorize inspecting other sibling user project folders outside this workspace.

## When To Use This Skill

Use this skill when all of these are true:

1. The user is asking about a local world project, not Toolkit internal maintenance.
2. The user wants multiplayer in the simplest grounded form.
3. The request can stay within default-room shared presence or default-room synchronized interactions.
4. The implementation target is the user's project runtime bootstrap. The default expected entry is `scripts/index.mjs` for PlayCanvas Editor-exported projects, **and** `main.js` (or whatever single JS entry the `index.html` loads) for engine-only local worlds scaffolded by [viverse-engine-only-local-world](../viverse-engine-only-local-world/SKILL.md).

If the target project is missing, ask for the local project folder before discussing implementation details.

## Engine-Only Integration Note

When the project is an engine-only local world (no PlayCanvas Editor export, no `scripts/index.mjs`), the `NetworkSystem` from `packages/network` must be registered against the `pc.Application` **before** `app.start()` runs. Translate any Editor-script-based wiring described in the network package guide into code-only equivalents: create an entity, add a `script` component, and instantiate the relevant script class in JS. Do not ask the user to do this step; do it for them in the same edit that wires multiplayer in.

## Preservation Rules

When adding default-room multiplayer into an already working world, treat the current local behavior as a preservation baseline.

Do not use multiplayer as permission to rewrite the world's bootstrap, player lifecycle, interaction flow, quest flow, or UI wiring.

Use one small additive integration point instead of a fresh unified architecture.

Keep the current single-player or offline path working unless the user explicitly asks to replace it.

If multiplayer introduces a new prerequisite such as app identity, auth state, or service readiness, gate that path before enabling it.

Do not let a missing multiplayer prerequisite break an existing local path that already worked.

Before claiming completion, name at least one existing behavior that must still work after the edit and verify that preserved behavior in addition to the new multiplayer path.

Four-rule hard-stop wording:

1. Do not rewrite a working world to add default-room multiplayer.
2. Keep the existing local path working until the multiplayer path is proven ready.
3. Gate app ID, auth, and other multiplayer prerequisites before turning the new path on.
4. Do not claim completion until one old behavior and one new multiplayer behavior both work.

Runtime proof rules for this workflow:

1. Do not treat a configured app ID, env value, or copied identifier as proof that multiplayer is wired; verify that the actual runtime consumer receives that identity.
2. Do not treat build success as proof that multiplayer initialized correctly; runtime network initialization must be checked directly.
3. If custom avatar types are used, do not treat a working local avatar as proof that remote avatars are registered correctly; validate the remote avatar path separately.
4. If the multiplayer path fails but the old local path still works, report that as a gated multiplayer failure rather than rewriting the world again.

## When Not To Use This Skill

Do not use this skill when the user wants:

- named-room selection
- matchmaking or room discovery
- custom room governance
- custom authority or conflict-resolution policy
- multiplayer plus unsupported storage or leaderboard guarantees
- a generic design document for all multiplayer cases

In those cases, explain that the current default-room workflow boundary is too narrow and that broader multiplayer support is not yet formalized.

## Language Rules

- Prefer "your project folder" before repo-oriented language.
- Prefer "default room" and "shared presence" before internal module names.
- Do not lead with package internals, source file names, or exported type names unless the user asks for implementation details.
- Do not ask the user to compare multiplayer wiring approaches, runtime-entry patterns, or Toolkit integration routes. Determine those yourself.
- If the target project's own files identify the main world script unambiguously, infer it and continue instead of asking the user to name files.
- If the only remaining choice is the gameplay goal, ask only whether they want shared presence or synchronized interactions.
- If the user gives too little detail, do not stop at a vague request. Ask one short practical question and include a short English fill-in template.
- Do not imply that generic multiplayer is solved just because the network package exists.

## Required Inputs

Before giving executable guidance, collect all of these and infer them only when the target project's own files identify them safely:

1. Project folder path
2. Runtime bootstrap file path only when it cannot be inferred safely from the project
3. Whether the user wants default-room shared presence or default-room synchronized interactions

For engine-only local worlds, detect the entry file by reading the `<script>` tags in `index.html` instead of asking the user to name the file.

For Editor-exported projects, use the conventional `scripts/index.mjs` path unless the target project's own files show a different bootstrap.

Preferred plain-language collection shape when details are actually missing:

`Project folder: /absolute/path Multiplayer goal: default-room shared presence / default-room synchronized interactions`

If the project folder is unknown, stop and ask for it.

If the main world script cannot be inferred safely, stop and ask for it.

## Missing Input Recovery

When the project target is known but the user does not yet know the app ID, give bounded prerequisite guidance instead of stopping with a vague request.

### How To Confirm App ID

Use only these grounded paths:

1. In VIVERSE Studio, open the user's world and check the Overview tab, where the world page shows the App ID.
2. If the user is already using the VIVERSE CLI, they can run `viverse-cli app list` to see existing application IDs.
3. If the user is creating a new world in Studio, the App ID appears on the world page after the world is created.

Do not invent Toolkit-specific local-file sources of truth for the production app ID.

Do not imply that default-room multiplayer can be turned on before the app ID is known.

If the user does not yet have a world in Studio, explain that they must first create or confirm the target world there, then return with the App ID.

If the app ID is the only remaining blocker and the user does not yet have a target world or app, ask one short practical question about whether they want to create or publish that target now in order to obtain the app ID.

If they do want to create or publish it now, reroute to [viverse-cli-publish](../viverse-cli-publish/SKILL.md) as the preferred path so the agent can create the target app and obtain the app ID directly; use direct Studio creation only when the CLI publish path is unavailable or the user explicitly wants the Studio path.

Do not turn missing app ID into an open-ended workflow discussion. Only offer the publish or create-world path when app identity is the actual blocker.

## Supported Output Shape

When using this skill, return:

1. a plain-language statement that this is a default-room multiplayer request
2. one short reason this narrower path fits
3. a plain-language description of the real repo capability that exists today
4. the immediate missing detail needed before implementation can proceed, including app ID when that prerequisite is still missing
5. one stop note if the user's request exceeds the default-room boundary

## Preferred Opening

Use an opening shape like this when it fits:

"This is mainly a default-room multiplayer request. The toolkit already has networking capability for that narrower path, and once I have your project folder plus the exact multiplayer goal and any missing app-identity prerequisite, I can ground the integration."

## Stop Conditions

Stop and ask or reroute when any of these are true:

1. The project folder is unknown.
2. The main world script cannot be inferred from the project.
3. The request is broader than default-room shared presence or synchronized interactions.
4. The request includes named rooms, matchmaking, room discovery, or room governance.
5. The request requires custom authority or conflict-resolution policy.
6. The request combines multiplayer with unsupported storage or leaderboard guarantees.

## Guardrails

1. Do not present package-level multiplayer capability as proof that generic multiplayer support is complete.
2. Do not invent custom room lifecycle or matchmaking rules.
3. Do not proceed with implementation planning until the user-project target is known.
4. Do not imply named rooms are within the first supported workflow.

## Validation Path

Before treating this path as grounded, validate at least one of these facts:

1. [packages/network/src/index.ts](../../../packages/network/src/index.ts) exports the multiplayer entry surface.
2. [packages/network/src/modules/multiplayer/MultiplayerModule.ts](../../../packages/network/src/modules/multiplayer/MultiplayerModule.ts) supports default-room behavior.
3. [toolkit-capability-catalog.md](../../toolkit-capability-catalog.md) still lists network as multiplayer capability input.
4. Run [scripts/validate-default-room-multiplayer.mjs](../../../scripts/validate-default-room-multiplayer.mjs) against the user's project when the folder path is known.

When implementation begins, validate the runtime path with these additional checks when they apply:

5. confirm that the app ID or equivalent identity reaches the real runtime consumer that initializes networking, not only a config file or env helper
6. confirm that one preserved local behavior still works after multiplayer wiring is added
7. if a custom avatar type is used, confirm the local avatar path and remote avatar registration path separately

If none of those checks can be confirmed, do not present this skill as grounded workflow support.

## Failure Shape

- Missing information: infer the runtime bootstrap file only when the target project's own files identify it safely, then ask only for the project folder and the narrower default-room goal that are still missing.
- Missing app ID or other multiplayer prerequisite: explain the bounded Studio or CLI path for confirming the app ID; if app identity is the only blocker and no target world exists yet, ask whether the user wants to create or publish that target now, otherwise stop until that prerequisite is known.
- Supported capability but unclear landing point: explain that the repo has default-room-capable network support, but the project integration target must be confirmed first.
- Unsupported workflow: explain that the request goes beyond the default-room multiplayer boundary.
- Runtime problem after integration begins: debug only after the target project file and default-room goal are known.

## Immediate Next Action

If the request clearly fits this skill and required inputs are missing, the immediate next action should be one short question asking for:

- the local project folder path
- whether the user only needs default-room shared presence or default-room synchronized interactions

Ask for the runtime bootstrap file only if it cannot be inferred from the project structure.
