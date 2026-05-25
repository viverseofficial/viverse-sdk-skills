# VIVERSE Default-Room Multiplayer Contract

This document defines the narrowest multiplayer integration contract that this repo can plausibly promote next.

It is smaller than the general multiplayer contract in [viverse-multiplayer-integration-contract.md](./viverse-multiplayer-integration-contract.md).

The purpose of this contract is to isolate one workflow that is easier to ground:

- integrate the existing network package into a user project
- use the package's default-room behavior only
- support shared player presence and other package-level synchronized behavior already provided by the module

This contract does not cover generic room architecture.

## Why This Version Exists

The broader multiplayer contract is still Draft Only because it leaves room for requests about named rooms, matchmaking, and custom room governance.

Default-room only is safer because the repo already exposes package behavior for:

- deriving a default room identifier from app identity
- auto-joining the default room when configured
- joining, leaving, and switching rooms at package level

By constraining the workflow to the default room, the future skill can avoid promising unsupported project-specific room logic.

## Contract Status

Current status: candidate contract for the safest first multiplayer workflow.

This contract is intended to reduce workflow scope, not to claim that a formal skill already exists.

## Verified Capability Sources

The claims in this contract are grounded in these repo-local sources:

- [packages/network/guide.md](./packages/network/guide.md)
- [packages/network/src/index.ts](./packages/network/src/index.ts)
- [packages/network/src/NetworkSystem.ts](./packages/network/src/NetworkSystem.ts)
- [packages/network/src/modules/multiplayer/MultiplayerModule.ts](./packages/network/src/modules/multiplayer/MultiplayerModule.ts)
- [toolkit-capability-catalog.md](./toolkit-capability-catalog.md)
- [skills/compose-toolkit-capabilities/SKILL.md](./skills/compose-toolkit-capabilities/SKILL.md)

## Supported Repo-Local Surface

This contract is grounded in the exported multiplayer package surface.

Safe repo-local facts:

1. [packages/network/src/index.ts](./packages/network/src/index.ts) exports `NetworkSystem` and `MultiplayerModule`.
2. [packages/network/src/NetworkSystem.ts](./packages/network/src/NetworkSystem.ts) can initialize registered modules through its options.
3. [packages/network/src/modules/multiplayer/MultiplayerModule.ts](./packages/network/src/modules/multiplayer/MultiplayerModule.ts) derives a default room ID from app identity.
4. [packages/network/src/modules/multiplayer/MultiplayerModule.ts](./packages/network/src/modules/multiplayer/MultiplayerModule.ts) supports auto-join default-room behavior.
5. [packages/network/src/modules/multiplayer/MultiplayerModule.ts](./packages/network/src/modules/multiplayer/MultiplayerModule.ts) exposes join, leave, and switch methods at package level.

Do not promise behavior beyond those facts.

## Intended User-Project Landing Surface

The intended landing surface is the user's local project runtime bootstrap.

Preferred target:

- the user's `scripts/index.mjs`

If the project uses a different bootstrap file, the workflow must identify that file before continuing.

Do not default to editing Toolkit authoring files in this repo for a user's multiplayer feature request.

## Supported First-Version Outcome

Any future formal default-room multiplayer workflow must stay within only this outcome:

- integrate the repo's exported network package into the user's project runtime
- initialize the multiplayer module
- use default-room behavior only
- support package-level shared player presence and synchronized interactions already implemented by the module
- stop and ask for clarification when the user asks for room behavior beyond the default-room scope

This first version should be described as default-room multiplayer integration, not generic multiplayer architecture.

## Unsupported Outcome

This contract does not support these claims:

- named-room selection workflows
- matchmaking or room discovery UX
- custom host-authoritative gameplay rules
- guarantees for late-join recovery of custom user-defined state
- multiplayer combined with unsupported storage or leaderboard requirements
- arbitrary room governance logic

If the request depends on any of those, the workflow must stop or reroute.

## Minimum Input Contract

Before executable guidance begins, the workflow must collect all of these fields and infer them only when the target project's own files identify them safely:

1. Project folder path
2. Runtime bootstrap file path
3. Whether the user wants default-room shared presence or default-room synchronized interactions

Preferred plain-language input shape:

- Project folder: path to the local world project
- Runtime entry: `scripts/index.mjs` or the file that starts the world logic
- Multiplayer goal: shared presence or synchronized interactions in the default room

If the project folder or runtime entry is unknown, stop and ask for it.

When the project target is known but the app ID is still unknown, explain the bounded Studio or CLI path for confirming it before implementation continues.

Use only these grounded paths for app ID recovery:

1. Open the user's world in VIVERSE Studio and read the App ID from the Overview tab.
2. If the user already uses the VIVERSE CLI, run `viverse-cli app list` to inspect existing application IDs.
3. If the user is creating a new world, create it in Studio first and then read the App ID from the world page.

Do not invent Toolkit-local file heuristics as a substitute for the production app ID.

If the user asks for named rooms, matchmaking, or room selection UI, this contract no longer applies.

## Supported Integration Pattern

The future workflow must follow this pattern.

1. Confirm the user project folder.
2. Confirm the runtime bootstrap file.
3. Confirm the request fits default-room shared presence or default-room synchronized interactions.
4. Route the integration toward the exported network package surface.
5. Treat the package's default-room behavior as the boundary of supported claims.
6. Treat the current local path as a preservation baseline when the world already works before multiplayer is added.
7. Use one small additive integration point instead of rewriting the world's bootstrap or interaction architecture.
8. Gate app identity, auth, and other multiplayer prerequisites before enabling the new path.
9. Stop when the user asks for custom room architecture.
10. Verify that app identity reaches the real runtime consumer that initializes networking; do not treat config-file or env-value presence as sufficient proof.
11. If a custom avatar type is used, validate the local avatar path and the remote avatar registration path separately.

## Stop Conditions

The workflow must stop and ask or reroute when any of these are true:

1. The user project folder is unknown.
2. The runtime bootstrap file is unknown.
3. The request is broader than default-room shared presence or synchronized interactions.
4. The request includes named rooms, matchmaking, room discovery, or room governance.
5. The request requires custom authority or conflict-resolution policy.
6. The request combines multiplayer with unsupported storage or leaderboard guarantees.

## Guardrails

Any future skill based on this contract must enforce all of these guardrails.

1. Do not claim a dedicated multiplayer helper already exists in this repo.
2. Do not present default-room support as proof that generic multiplayer is solved.
3. Do not invent custom room, matchmaking, or authority behavior.
4. Do not proceed with implementation advice until the user-project target is known.
5. Do not imply named rooms are part of the first supported workflow.
6. Do not rewrite a working world just to add default-room multiplayer.
7. Do not let a missing multiplayer prerequisite break an existing local path that already worked.
8. Do not claim completion until one preserved local behavior and one new multiplayer behavior both work.
9. Do not treat a configured app ID, env value, or copied identifier as proof that multiplayer is wired; verify the actual runtime consumer.
10. Do not treat a working local avatar as proof that remote avatars are registered correctly when multiplayer uses a custom avatar type.

Four-rule hard-stop wording:

1. Do not rewrite a working world to add default-room multiplayer.
2. Keep the existing local path working until the multiplayer path is proven ready.
3. Gate app ID, auth, and other multiplayer prerequisites before turning the new path on.
4. Do not claim completion until one old behavior and one new multiplayer behavior both work.

## Validation Path

Before using this contract as grounded support, validate at least one of these facts:

1. [packages/network/src/index.ts](./packages/network/src/index.ts) exports `NetworkSystem` and `MultiplayerModule`.
2. [packages/network/src/modules/multiplayer/MultiplayerModule.ts](./packages/network/src/modules/multiplayer/MultiplayerModule.ts) derives a default room ID and exposes join or switch behavior.
3. [toolkit-capability-catalog.md](./toolkit-capability-catalog.md) still lists network as multiplayer capability input.

When implementation begins, also validate these runtime facts when they apply:

4. the app ID or equivalent identity reaches the real runtime consumer that initializes networking, not only a config file or env helper
5. one preserved local behavior still works after multiplayer wiring is added
6. if a custom avatar type is used, the local avatar path and remote avatar registration path are both validated separately

If those validations fail, do not treat this workflow as grounded.

## Failure Shape

Use these bounded explanations.

- Missing information: ask for the project folder, runtime bootstrap file, and whether the user only needs default-room shared presence or synchronized interactions.
- Missing app ID or other multiplayer prerequisite: explain the bounded Studio or CLI path for confirming the app ID, then stop until that prerequisite is known; do not claim that config presence alone proves the runtime is ready.
- Supported capability but unclear landing point: explain that the repo has default-room-capable multiplayer package support, but the project integration target must be confirmed first.
- Unsupported workflow: explain that the request goes beyond default-room multiplayer and needs a broader contract.
- Runtime problem after integration begins: debug only after the project target and default-room goal are known, and distinguish between config presence, runtime consumer wiring, and remote-avatar registration failures.

## Recommended Next Step

If the repo wants the fastest path toward a low-risk multiplayer skill, use this contract as the candidate boundary.

The next strongest follow-up would be one of these:

1. a small user-project example that shows how default-room multiplayer is bootstrapped
2. a validator or helper that confirms the project target and required package surface
3. a dedicated skill that stays strictly inside this default-room contract
