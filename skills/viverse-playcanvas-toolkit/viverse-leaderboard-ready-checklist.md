# VIVERSE Leaderboard Ready Checklist

Use this checklist before moving a future leaderboard draft into [skills](./skills) or exposing it as a formal supported workflow.

This is a promotion checklist, not a general design note.

The purpose is to answer one question clearly:

- is the current leaderboard workflow boundary safe to treat as formally supported?

## Current Default Answer

Current answer: ready to promote when the workflow wording stays inside the current first-version boundary.

The current leaderboard line now has a real executable installer, a runtime boundary template, a readiness spec, a downstream contract, a validator path, and verified real-runtime proof for submit plus bounded top-entries and self-rank readback under one validated app identity and leaderboard configuration.

## Promotion Rule

Do not promote a leaderboard workflow into formal workflow inventory unless every required item in this document is satisfied.

If any required item is still missing, keep leaderboard outside [skills](./skills).

## Section A: Evidence Chain

All of these must be true.

- [x] The workflow still maps to a real repo-local leaderboard capability source, helper, or validator.
- [x] The workflow does not make any core promise that cannot be traced to a repo-local file, helper, contract, or real implementation surface.
- [x] The workflow does not rely on remote skill wording as the primary implementation proof.
- [x] The workflow can name which local artifact actually grounds score submit and bounded ranking readback behavior.

Fail this section if the workflow would require invented SDK calls, invented target files, or remote-only implementation assumptions.

## Section B: Scope Boundary

All of these must be true.

- [x] The supported scope is still limited to one score submit path plus the bounded ranking readback shapes explicitly covered by the current runtime boundary contract.
- [x] Multi-board or multi-category orchestration is still explicitly out of scope.
- [x] Generic ranking UI architecture is still explicitly out of scope.
- [x] Leaderboard combined with unsupported storage flow is still explicitly out of scope.
- [x] Leaderboard combined with unsupported multiplayer orchestration is still explicitly out of scope.

Fail this section if anyone expands the workflow wording into generic scoring or backend support without a new contract and review.

Current bounded readback shapes may include top entries and around-user/self-rank only when they are grounded by the checked-in runtime boundary and remain inside the first-version contract.

## Section C: User-Project Landing Surface

All of these must be true.

- [x] The workflow can name the intended user-project landing surface precisely.
- [x] The preferred landing surface remains the user's `scripts/index.mjs` or a clearly identified equivalent bootstrap file.
- [x] The workflow does not default to editing Toolkit authoring files in this repo for end-user leaderboard requests.
- [x] The workflow can explain what to ask for when the landing surface is unknown.

Fail this section if the answer to "where does this actually land in the user's project?" is still vague.

## Section D: Input Contract And Stop Conditions

All of these must be true.

- [x] The workflow requires the project folder path before executable guidance.
- [x] The workflow requires the runtime bootstrap file path, or confirmation that the project uses `scripts/index.mjs`.
- [x] The workflow requires app identity readiness before executable guidance.
- [x] The workflow requires the Studio Meta Name that the code will use as the leaderboard key before executable guidance.
- [x] When the user still needs to create the leaderboard, the workflow says Studio requires both Display Name and Meta Name.
- [x] The workflow stops if the project folder is unknown.
- [x] The workflow stops if the runtime bootstrap file is unknown.
- [x] The workflow stops if app identity or leaderboard Meta Name is unknown.
- [x] The workflow stops if the request expands into broader scoring architecture, storage, or multiplayer orchestration.

Fail this section if the workflow would continue by guessing missing project context or configuration state.

## Section E: Validation Path

All of these must be true.

- [x] There is at least one cheap validation step that can confirm the repo-local leaderboard prerequisites still exist.
- [x] That validation step can be described in one sentence.
- [x] The workflow can distinguish pass and fail signals for the validation step.
- [x] The workflow does not rely only on descriptive prose without any falsifiable check.

Preferred validation examples:

- verify a real leaderboard helper or validator exists and checks project target, app identity, and the leaderboard Studio Meta Name used at runtime
- verify the declared repo-local prerequisite surfaces still exist and the helper reports clear fail states
- verify the workflow distinguishes local localhost preview from VIVERSE preview or published runtime before claiming real leaderboard submit or readback support

## Section F: Failure Shape

All of these must be true.

- [x] The workflow distinguishes missing information from unsupported workflow.
- [x] The workflow distinguishes missing prerequisite state from runtime failure.
- [x] The workflow does not collapse all failures into broad architecture advice.
- [x] The workflow uses plain-language failure wording for end users.

Fail this section if the workflow would respond to every failure with speculative implementation guidance.

## Section F1: Environment-Mode Discipline

All of these must be true.

- [x] The workflow distinguishes local localhost preview from VIVERSE preview or published runtime before claiming real leaderboard submit or readback support.
- [x] The workflow treats localhost preview as local wiring validation only unless a compatible leaderboard client is directly confirmed there.
- [x] The workflow requires a real submit or readback client in VIVERSE preview or published runtime before claiming leaderboard runtime success.

Fail this section if the workflow treats installer success, validator success, build success, or localhost execution alone as proof that real leaderboard submit or readback works.

## Section G: Example Or Grounding Artifact

At least one of these must be true before promotion.

- [x] A user-project example exists that shows the final leaderboard landing shape in practice.
- [x] A helper or validator exists that checks the project target and basic leaderboard prerequisites.

Notes:

- a downstream implementation contract is useful, but it is not sufficient by itself for promotion
- a validator specification is useful, but it is not sufficient by itself for promotion
- contract-only or spec-only grounding may support draft governance, but formal promotion requires a real example or a real helper or validator

Fail promotion if neither a real user-project example nor a real helper or validator exists.

## Section H: User-Facing Language

All of these must be true.

- [x] The workflow leads with plain language such as leaderboard, score, or ranking.
- [x] The workflow does not lead with raw file archaeology or maintainer-only governance language.
- [x] The workflow does not imply that the repo already has a formal leaderboard skill today.
- [x] The workflow keeps the user in the role of end user rather than repo maintainer.

Fail this section if the workflow reads like internal implementation notes rather than user guidance.

## Promotion Decision Labels

Use one label after checking all sections.

### Ready To Promote

Use only when:

- every required checkbox in Sections A through F is complete
- every required checkbox in Section F1 is complete
- Section G has at least one checked real grounding artifact from the first two items only
- Section H is complete

### Keep As Draft

Use when:

- the scope is good but one or more required sections are incomplete
- the workflow is still useful as internal guidance but not safe as formal inventory

### Reject Promotion

Use when:

- the workflow still depends on remote-only implementation logic
- the evidence chain is no longer grounded locally
- the user-project landing surface is no longer precise

## Short Review Record

Fill this when reviewing promotion.

- Review date: 2026-05-12
- Reviewer: GitHub Copilot
- Decision: Ready To Promote
- Blocking items, if any: none inside the current first-version boundary
- Immediate next action: keep user-facing routing and troubleshooting aligned with the current one-board boundary

## Related Documents

- [viverse-leaderboard-skill-review.md](./viverse-leaderboard-skill-review.md)
- [viverse-leaderboard-readiness-spec.md](./viverse-leaderboard-readiness-spec.md)
- [viverse-leaderboard-integration-contract.md](./viverse-leaderboard-integration-contract.md)
- [viverse-leaderboard-validator-spec.md](./viverse-leaderboard-validator-spec.md)
- [viverse-skill-acceptance-checklist.md](./viverse-skill-acceptance-checklist.md)
