# VIVERSE Leaderboard Integration Contract

This document defines the narrowest leaderboard integration contract that this repo can plausibly promote next.

It is intended to be the smallest fixed downstream contract that could eventually support a dedicated leaderboard workflow.

It is not proof that a formal leaderboard skill already exists.

## Why This Version Exists

Leaderboard is a real user need, and an official remote leaderboard workflow exists.

What was previously missing in this repo was a stable local execution path for end users.

Today the repo can ground the first-version workflow locally:

- the user-project target should be a local world project
- auth and profile prerequisites are real via the account package
- app identity and publish routing are real via existing publish guidance
- a dedicated leaderboard installer, runtime boundary, and validator now exist locally

This contract exists to define and preserve the smallest supported workflow boundary without widening claims beyond the proven first version.

## Contract Status

Current status: active first-version contract for the safest promoted leaderboard workflow.

This contract is intended to reduce workflow scope, even though a formal leaderboard skill and helper now exist.

## Verified Capability Sources

The claims in this contract are grounded in these repo-local sources:

- [packages/account/guide.md](./packages/account/guide.md)
- [packages/account/src/index.ts](./packages/account/src/index.ts)
- [skills/viverse-cli-publish/SKILL.md](./skills/viverse-cli-publish/SKILL.md)
- [scripts/publish-build-output-to-viverse.mjs](./scripts/publish-build-output-to-viverse.mjs)
- [viverse-playcanvas-leaderboard-readiness-spec.md](./viverse-playcanvas-leaderboard-readiness-spec.md)
- [viverse-playcanvas-leaderboard-skill-review.md](./viverse-playcanvas-leaderboard-skill-review.md)

External workflow knowledge may inform a future implementation shape, but it must not be treated as local implementation proof.

## Supported Repo-Local Surface

This contract is grounded only in local prerequisite surfaces and workflow boundaries.

Safe repo-local facts:

1. [packages/account/guide.md](./packages/account/guide.md) documents user authentication and VIVERSE service integration as a real package concern in this repo.
2. [packages/account/src/index.ts](./packages/account/src/index.ts) exports account-system surfaces for auth-related integration.
3. [skills/viverse-cli-publish/SKILL.md](./skills/viverse-cli-publish/SKILL.md) already treats stable app identity and publish targeting as real workflow concerns.
4. [scripts/publish-build-output-to-viverse.mjs](./scripts/publish-build-output-to-viverse.mjs) provides a real repo-local publish helper that depends on app-level targeting.
5. [viverse-playcanvas-leaderboard-readiness-spec.md](./viverse-playcanvas-leaderboard-readiness-spec.md) already defines the minimum inputs and guardrails for a leaderboard workflow in this repo.
6. [scripts/create-leaderboard-runtime-boundary.mjs](./scripts/create-leaderboard-runtime-boundary.mjs) installs or refreshes the leaderboard runtime boundary into a user project.
7. [scripts/validate-leaderboard-integration.mjs](./scripts/validate-leaderboard-integration.mjs) validates the project target, app identity, leaderboard key, and mode boundary.
8. [viverse-playcanvas-leaderboard-real-runtime-test.md](./viverse-playcanvas-leaderboard-real-runtime-test.md) records a real-runtime pass for submit plus bounded readback.

Do not promise behavior beyond those facts.

## Intended User-Project Landing Surface

The intended landing surface is the user's local project runtime bootstrap.

Preferred target:

- the user's `scripts/index.mjs`

If the project uses a different bootstrap file, the workflow must identify that file before continuing.

Do not default to editing Toolkit authoring files in this repo for a user's leaderboard feature request.

## Supported First-Version Outcome

Any future formal leaderboard workflow must stay within only this outcome:

- confirm the user's local project folder
- confirm the runtime bootstrap file where leaderboard behavior should land
- confirm app identity is already available or explicitly blocked
- confirm the leaderboard identifier or equivalent configuration input
- support one score submit path
- support one ranking readback shape, such as top entries or self rank
- stop and ask for clarification when the request expands into broader scoring architecture or unsupported combined flows

This first version should be described as leaderboard integration, not generic scoring or backend architecture.

## Unsupported Outcome

This contract does not support these claims:

- arbitrary leaderboard SDK usage is already verified locally
- multi-category or multi-board orchestration in one first-pass workflow
- fully generic ranking UI architecture
- leaderboard combined with unsupported storage guarantees
- leaderboard combined with unsupported multiplayer orchestration

If the request depends on any of those, the workflow must stop or reroute.

## Minimum Input Contract

Before executable guidance begins, the workflow must collect all of these fields and infer them only when the target project's own files identify them safely:

1. Project folder path
2. Runtime bootstrap file path
3. App identity readiness
4. Leaderboard Studio Meta Name, which the code will use as the leaderboard key
5. Whether the user still needs to create the leaderboard in Studio and therefore still needs a Display Name
6. Whether sign-in is required for the requested experience
7. The score submit trigger
8. The ranking readback goal

Preferred plain-language input shape:

- Project folder: path to the local world project
- Runtime entry: `scripts/index.mjs` or the file that starts the world logic
- App identity ready: yes or no
- Leaderboard Meta Name: exact Studio Meta Name the code will use as the leaderboard key
- Leaderboard Display Name: required only when the user still needs to create the leaderboard in Studio
- Sign-in required: yes or no
- Score trigger: end of match, checkpoint, action, or other
- Readback goal: top entries, self rank, or both

If the project folder or runtime entry is unknown, stop and ask for it.

If app identity or leaderboard Meta Name is unknown, stop and ask before proposing implementation.

## Supported Integration Pattern

The future workflow must follow this pattern.

1. Confirm the user project folder.
2. Confirm the runtime bootstrap file.
3. Confirm app identity readiness.
4. Confirm the leaderboard Studio Meta Name that the code will use as the leaderboard key.
5. Confirm whether the request fits one score submit path plus one ranking readback shape.
6. Keep leaderboard integration bounded to that first-version scope.
7. Treat the current local path as a preservation baseline when the world already works before leaderboard support is added.
8. Use one small additive integration point instead of rewriting the world's bootstrap, UI flow, or interaction architecture.
9. Gate app identity, sign-in, and leaderboard configuration prerequisites before enabling the new path.
10. Stop when the request expands into unsupported storage, multiplayer, or generic backend design.
11. Verify that app identity, leaderboard Meta Name, and sign-in-dependent configuration reach the real runtime consumer that submits or reads leaderboard data; do not treat config presence as sufficient proof.
12. Distinguish local localhost preview from VIVERSE preview or published runtime: localhost may validate only local hooks, payload construction, and UI unless a compatible leaderboard client is directly present.

## Stop Conditions

The workflow must stop and ask or reroute when any of these are true:

1. The user project folder is unknown.
2. The runtime bootstrap file is unknown.
3. App identity is missing or still ambiguous.
4. The leaderboard identifier or equivalent configuration input is unknown.
5. The request expands into multiple leaderboard categories, generic ranking UI architecture, storage, or multiplayer orchestration.
6. The request assumes broader helper behavior than the current installer, validator, and runtime boundary actually prove.

## Guardrails

Any future skill based on this contract must enforce all of these guardrails.

1. Do not treat remote leaderboard workflow guidance as proof of local support.
2. Do not invent SDK calls, response shapes, or auth flows beyond verified repo-local evidence.
3. Do not proceed with implementation advice until the user-project target is known.
4. Do not imply that storage or multiplayer dependencies are already solved just because the user also wants leaderboard behavior.
5. Do not widen the helper claims beyond one app ID, one leaderboard Meta Name, submit, top-entries readback, and self-rank readback.
6. Do not rewrite a working world just to add leaderboard support.
7. Do not let a missing leaderboard prerequisite break an existing local path that already worked.
8. Do not claim completion until one preserved local behavior and one new leaderboard behavior both work.
9. Do not treat a configured app ID, leaderboard Meta Name, or sign-in flag as proof that the runtime leaderboard path is wired correctly.
10. Do not treat local localhost preview as proof that real leaderboard submit or readback works unless the actual runtime client is directly confirmed in that environment.

Four-rule hard-stop wording:

1. Do not rewrite a working world to add leaderboard support.
2. Keep the existing local path working until the leaderboard path is proven ready.
3. Gate app ID, sign-in, and other leaderboard prerequisites before turning the new path on.
4. Do not claim completion until one old behavior and one new leaderboard behavior both work.

## Validation Path

Before using this contract as grounded support, validate at least one of these facts:

1. [packages/account/src/index.ts](./packages/account/src/index.ts) still exports account/auth surfaces.
2. [skills/viverse-cli-publish/SKILL.md](./skills/viverse-cli-publish/SKILL.md) still requires stable app identity and publish targeting.
3. [viverse-playcanvas-leaderboard-readiness-spec.md](./viverse-playcanvas-leaderboard-readiness-spec.md) still defines leaderboard helper or contract requirements before promotion.

When implementation begins, also validate these runtime facts when they apply:

4. the app ID, leaderboard Meta Name, and sign-in-dependent config reach the real runtime consumer that submits or reads leaderboard data
5. one preserved local behavior still works after leaderboard wiring is added
6. build success is not used as the only proof that leaderboard runtime initialization succeeded
7. the workflow identifies whether the current environment is local localhost preview or VIVERSE preview or published runtime before claiming real submit or readback support

If those validations fail, do not treat this workflow as grounded.

If those validations pass, treat the contract as grounded first-version support only while the workflow stays within the same boundary.

## Failure Shape

Use these bounded explanations.

- Missing information: ask for the project folder, runtime bootstrap file, app identity status, leaderboard Meta Name, and the score/readback goal.
- Supported prerequisite surface but unclear landing point: explain that auth and app-target prerequisites are real in this repo, but leaderboard integration still needs a confirmed project target.
- Unsupported workflow: explain that the request goes beyond the first leaderboard boundary and needs a broader contract.
- Runtime problem after integration begins: debug only after the project target, app identity, and leaderboard Meta Name are known, and distinguish between config presence and the real runtime consumer receiving those values.
- Runtime problem after integration begins: debug only after the project target, app identity, and leaderboard Meta Name are known, and distinguish between local localhost preview that lacks a compatible runtime client and VIVERSE runtime where the real consumer still fails.

## Recommended Next Step

If the repo wants the fastest path toward a low-risk leaderboard workflow, use this contract as the active boundary.

The next strongest follow-up would be one of these:

1. keep the user-facing skill and routing inside this contract
2. keep troubleshooting language aligned with the proven one-board boundary
3. rerun governance review only when the installer, validator, or runtime adapter changes materially
