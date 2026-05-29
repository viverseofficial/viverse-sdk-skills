# VIVERSE Multiplayer Integration Contract

This document defines the minimum grounded integration contract required before adding a dedicated end-user multiplayer workflow skill to this repo.

It is intentionally narrower than the general idea of "multiplayer support".

The goal is to describe what this repo can safely claim today, where a multiplayer feature should land in a user project, and where the workflow must stop instead of inventing missing architecture.

## Why This Exists

The repo already has real multiplayer capability sources in [packages/network](./packages/network).

However, package-level capability alone is not enough to claim a complete end-user multiplayer workflow.

The missing piece is a fixed integration contract that answers these questions:

- where multiplayer behavior should land in a user project
- what the minimum supported room model is
- which package-level surface is the supported source of truth
- which requests are in scope for a first formal workflow
- when the workflow must stop and ask for more project context

## Contract Status

Current status: draft integration contract for future workflow productization.

This contract is sufficient for design review and skill-boundary planning.

It is not, by itself, proof that a dedicated multiplayer skill is already ready for formal inventory.

## Verified Capability Sources

The claims in this contract are grounded in these repo-local sources:

- [packages/network/guide.md](./packages/network/guide.md)
- [packages/network/package.json](./packages/network/package.json)
- [packages/network/src/index.ts](./packages/network/src/index.ts)
- [packages/network/src/NetworkSystem.ts](./packages/network/src/NetworkSystem.ts)
- [packages/network/src/modules/multiplayer/MultiplayerModule.ts](./packages/network/src/modules/multiplayer/MultiplayerModule.ts)
- [toolkit-capability-catalog.md](./toolkit-capability-catalog.md)
- [skills/compose-toolkit-capabilities/SKILL.md](./skills/compose-toolkit-capabilities/SKILL.md)

Do not make promises outside what these sources can support unless a new repo-local contract or helper is added first.

## Supported Repo-Local Surface

The supported repo-local multiplayer surface is the network package exported from [packages/network/src/index.ts](./packages/network/src/index.ts).

The contract assumes these stable facts:

1. The repo exposes a `NetworkSystem` export.
2. The repo exposes a `MultiplayerModule` export.
3. The multiplayer module has room-oriented methods for default join, join, leave, and switch.
4. The network system can initialize registered modules through its options.

These are the grounded capability boundaries for a future multiplayer workflow.

## Intended User-Project Landing Surface

The intended landing surface is the user's local project runtime entry.

Preferred first target:

- the user's `scripts/index.mjs`

If the project does not use that entry shape, the workflow must identify the equivalent runtime bootstrap file before proceeding.

This contract does not support editing Toolkit authoring files in this repo as the default destination for user multiplayer features.

## First-Version Supported Outcome

Any future formal multiplayer workflow must stay within this narrow outcome:

- connect a user project to the repo's existing network system
- initialize the multiplayer module through the supported network package surface
- join the default room or a specified room
- allow package-level synchronized player or interaction behavior already implemented by the module
- describe the exact next project-specific question when the runtime target is unclear

This first version is multiplayer integration guidance, not a full room-architecture generator.

## First-Version Unsupported Outcome

The future workflow must not claim support for these areas unless a stronger repo-local contract is added:

- fully generic matchmaking design
- arbitrary room discovery UI flows
- authoritative game-rule architecture beyond the package's documented behavior
- late-join recovery guarantees for user-defined custom state
- custom persistence plus multiplayer synchronization in one workflow
- leaderboard plus multiplayer orchestration in one workflow
- project-specific room governance rules that are not defined in the repo

## Minimum Input Contract

Before any executable multiplayer guidance, the workflow must collect all of these fields and infer them only when the target project's own files identify them safely:

1. Project folder path
2. Runtime entry point path or confirmed equivalent bootstrap surface
3. Requested multiplayer outcome
4. Whether the user wants the default room behavior or an explicitly named room behavior

Preferred plain-language input shape:

- Project folder: path to the local world project
- Runtime entry: `scripts/index.mjs` or the file that starts the world logic
- Multiplayer goal: shared presence, synchronized interactions, room switching, or other
- Room target: default room or named room

If the project folder and runtime entry are both unknown, the workflow must stop and ask for them.

## Supported Room Model

The only safe first-version room model is a bounded model based on the package's existing room-oriented methods.

Safe claims:

- the module can derive a default room identifier from the app identity
- the module exposes room join, leave, and switch behavior
- the module can auto-join the default room when configured to do so

Unsafe claims:

- matchmaking strategy is already solved for all game types
- room selection UX is already standardized for user projects
- host or master-user policy is sufficient to describe all authority decisions in custom game logic

## Supported Integration Pattern

Any future workflow must follow this pattern.

1. Confirm the user project folder.
2. Confirm the runtime entry point.
3. Confirm whether the request fits the supported first-version multiplayer scope.
4. Route the implementation toward the exported network package surface.
5. Use package-level room behavior as the boundary of supported claims.
6. Treat the current local path as a preservation baseline when the world already works before multiplayer is added.
7. Use one small additive integration point instead of rewriting the world's bootstrap, player lifecycle, interaction flow, quest flow, or UI wiring.
8. Gate app identity, auth, and other multiplayer prerequisites before enabling any new path.
9. Do not let a missing multiplayer prerequisite break an existing local path that already worked.
10. Stop when the request requires undocumented matchmaking, authority, or user-project-specific room governance.
11. Verify that app identity or equivalent config reaches the real runtime consumer that initializes networking; do not treat config-file or env-value presence as sufficient proof.
12. If custom avatar types are used, validate the local avatar path and the remote avatar registration path separately.

Do not skip directly from "the repo has a network package" to "the user's custom multiplayer architecture is supported".

## Stop Conditions

A multiplayer workflow based on this contract must stop and ask or reroute when any of these are true:

1. The user project folder is unknown.
2. The runtime entry point is unknown.
3. The request is still too broad to map to shared presence, synchronized interactions, or room switching.
4. The request requires matchmaking behavior not grounded in repo-local workflow support.
5. The request requires custom authority rules or conflict resolution that the repo has not documented.
6. The request combines multiplayer with unsupported storage or leaderboard guarantees.

## Guardrails

Any future multiplayer skill must enforce all of these guardrails.

1. Do not claim that a dedicated multiplayer workflow helper already exists in this repo.
2. Do not present package-level exports as proof of a complete end-user workflow.
3. Do not invent custom room lifecycle rules beyond the exported module behavior.
4. Do not imply that all multiplayer gameplay patterns are covered because the network package exists.
5. Do not promise project-specific matchmaking, host-authoritative rules, or late-join recovery for custom game state without stronger repo-local contracts.
6. Do not proceed with implementation planning until the user-project target is known.
7. Do not treat a configured app ID, env value, or copied identifier as proof that the multiplayer runtime is wired correctly.
8. Do not treat a working local avatar as proof that remote avatar registration is correct when multiplayer uses a custom avatar type.

## Validation Path

Before treating multiplayer guidance as grounded, validate at least one of these facts:

1. [packages/network](./packages/network) exists and is a published workspace package.
2. [packages/network/src/index.ts](./packages/network/src/index.ts) exports `NetworkSystem` and `MultiplayerModule`.
3. [packages/network/src/modules/multiplayer/MultiplayerModule.ts](./packages/network/src/modules/multiplayer/MultiplayerModule.ts) exposes join or leave room methods.
4. [toolkit-capability-catalog.md](./toolkit-capability-catalog.md) still classifies network as multiplayer capability input.

When implementation begins, also validate these runtime facts when they apply:

5. the app ID or equivalent identity reaches the real runtime consumer that initializes networking, not only a config file or env helper
6. one preserved local behavior still works after multiplayer wiring is added
7. if a custom avatar type is used, the local avatar path and remote avatar registration path are both validated separately

If none of these validations are possible, treat the workflow as ungrounded.

## Failure Shape

Any future multiplayer workflow must distinguish these cases clearly.

- Missing information: ask for the project folder, runtime entry point, and the specific multiplayer goal.
- Supported capability but missing integration target: explain that the repo has multiplayer package support, but the project landing point must be confirmed first.
- Unsupported workflow: explain that the request goes beyond the current first-version multiplayer contract.
- Runtime problem after integration begins: debug only after the project target and requested room behavior are known, and distinguish between config presence, runtime consumer wiring, and remote-avatar registration failures.

## Recommended Next Step Before Formal Skill

Before adding a dedicated multiplayer skill to [skills](./skills), add one of these:

1. a user-project integration example that shows the expected runtime bootstrap shape
2. a narrower contract document for default-room multiplayer only
3. a helper or validator that checks the project target and basic multiplayer prerequisites

Without one of those, multiplayer remains Draft Only rather than Ready.
