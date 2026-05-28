# VIVERSE Leaderboard Workflow Readiness Spec

This document defines the minimum helper surface, guardrails, and downstream contract that made the dedicated VIVERSE leaderboard workflow skill safe to add to this repo and that future changes must continue to preserve.

The goal is to avoid adding a leaderboard workflow that sounds supported but still depends on guessed SDK usage, guessed runtime targets, or remote-only examples.

## Why This Exists

The repo has already confirmed that leaderboard is a real user need and that an official remote skill exists.

What is still missing locally is the full evidence chain needed for a safe user-facing workflow:

- a stable leaderboard landing surface in the user's project
- a bounded auth and app-identity prerequisite path
- a fixed score submit and ranking readback contract
- a local helper or validator that can detect missing prerequisites
- bounded troubleshooting language for common leaderboard failures

Do not treat the leaderboard workflow as ready if future changes break the requirements in this document.

## Scope

This spec is for user-facing workflows that help with one or more of these tasks:

- submit a score to a VIVERSE leaderboard
- read leaderboard rankings or top entries
- show leaderboard output inside a VIVERSE world experience
- troubleshoot leaderboard prerequisites such as app identity or sign-in

This spec is not for generic score design discussion that stays purely conceptual.

## Promotion Rule

Do not keep the dedicated leaderboard skill or any future slash prompt in the supported inventory unless all of the following remain true:

1. There is a stable target implementation surface in the user's project.
2. There is a documented minimum input contract for the user.
3. There is a repeatable helper path or fixed downstream implementation contract.
4. There is a bounded answer shape for failure cases.
5. There is a clear rule for when to stop and ask for missing project context.

If any item stops being true, route leaderboard guidance back through broader composition advice only and present it as unsupported for direct execution.

## Required Helper Surface

The repo now relies on these helper surfaces to keep leaderboard inside a formal workflow boundary.

### Option A: Repo Helper

A repo-local helper that can validate or scaffold the leaderboard prerequisites.

Minimum expectations:

- confirms the target project folder
- confirms the runtime entry point to modify
- validates required app identity input
- validates the leaderboard identifier or equivalent configuration input
- validates whether sign-in or auth context is available when required
- prints the exact next action when a prerequisite is missing

### Option B: Fixed Downstream Contract

A documented implementation contract that the agent can follow without inventing missing architecture.

Minimum expectations:

- fixed target file shape in the user project
- fixed runtime point where score submit and ranking readback happen
- fixed auth prerequisite rule
- fixed leaderboard identifier/configuration rule
- fixed display or readback rule for the first version
- fixed error-handling expectations

Without Option A or Option B, do not keep leaderboard promoted as a dedicated workflow.

## Required User Input Contract

Before any executable leaderboard guidance, the workflow must be able to collect or infer these fields:

1. Project folder path
2. Runtime entry point path
3. Existing app identity or the rule for how it will be obtained
4. Leaderboard Studio Meta Name, which the code will use as the leaderboard key
5. Whether the user still needs to create the leaderboard in Studio and therefore still needs a Display Name
6. Whether sign-in is required for score submission or ranking access in the target experience
7. The score event that should trigger submission
8. The ranking readback goal, such as top 10, self rank, or both
9. The in-world display or UI surface where results should appear

Plain-language collection shape:

- Project folder: path to the local world project
- Leaderboard goal: submit score, read top entries, show self rank, or other
- Runtime entry: `scripts/index.mjs` or the file that starts the world logic
- App identity ready: yes or no
- Leaderboard Meta Name: exact Studio Meta Name the code will use as the leaderboard key
- Leaderboard Display Name: required only when creating the leaderboard in Studio
- Sign-in required: yes or no
- Score trigger: end of match, checkpoint, action, or other
- Readback view: top list, self rank, both, or other

If more than two of these are unknown, the workflow must stop and ask for clarification instead of proposing implementation.

When the user is creating a new leaderboard, the workflow must say that Studio requires both Display Name and Meta Name. The code uses the Meta Name as the leaderboard key, not the Display Name, and Meta Name may contain only letters, numbers, and `~@$-,.`.

## Required Implementation Decisions

Before the workflow is considered safe, it must define defaults for each of these decisions.

### 1. Score Boundary

The workflow must define what counts as the score payload for the first supported version.

Minimum decisions:

- supported score type or shape
- whether the first version supports one score only or multiple categories
- duplicate submission rule
- score direction rule, such as descending for higher-is-better cases

### 2. Submit Lifecycle

The workflow must define when score submission occurs and what prerequisites must already be true.

Minimum decisions:

- score submit trigger
- retry rule
- what counts as a successful post
- what the user sees when submit cannot proceed

### 3. Readback Lifecycle

The workflow must define when leaderboard data is fetched and how the first-version UI depends on it.

Minimum decisions:

- first read timing
- refresh timing or manual refresh rule
- loading or empty-state behavior
- fallback behavior when ranking cannot be fetched

### 4. Guest And Auth Behavior

The workflow must define how the experience behaves when the player is not signed in.

Minimum decisions:

- whether guest readback is allowed
- whether guest score submission is blocked
- when the user is prompted to sign in
- what the workflow says when auth is present locally but app identity is invalid

### 5. Display Boundary

The workflow must define what the first-version result actually shows.

Minimum decisions:

- top entries only, self rank only, or both
- where the display belongs in the user project
- what empty-state wording is acceptable
- what should stay out of scope, such as full leaderboard UI architecture

## Guardrails

Any future leaderboard workflow must enforce all of these guardrails.

1. Do not imply leaderboard is already supported unless the project has a verified local implementation path.
2. Do not invent SDK calls, response shapes, or auth flows that are not grounded in repo-supported usage.
3. Do not propose leaderboard edits until the target project folder and runtime entry point are known.
4. Do not treat the remote leaderboard skill as equivalent to local implementation support.
5. Do not mix leaderboard guidance with unsupported storage or multiplayer guarantees unless the user explicitly needs both.
6. Do not hide app identity or auth prerequisites.
7. Do not answer with broad architecture prose when the user is asking for an executable next step.
8. Do not promote leaderboard guidance into a final workflow helper until validation steps exist.

## Validation Requirements

Before promoting leaderboard to a supported workflow, there must be a lightweight validation path.

Minimum validation coverage:

1. Missing app identity is detected and reported clearly.
2. Missing leaderboard identifier or configuration is detected and reported clearly.
3. Missing runtime target is detected and reported clearly.
4. Score submit prerequisites can be checked before code changes begin.
5. Ranking readback prerequisites can be checked before UI work begins.
6. Failure output distinguishes configuration issues from runtime fetch or submit failures.
7. The workflow can prove which local file or helper it will actually touch.

## Required Preserved Deliverables

Keep these deliverables in place before treating leaderboard as a supported workflow:

1. Keep a leaderboard implementation contract document for user-project integration.
2. Keep a helper or validator that checks the minimum prerequisites.
3. Keep a narrow troubleshooting section for app identity, auth, leaderboard identifier, and readback failures.
4. Keep the dedicated leaderboard skill inside the same bounded contract.
5. Only consider a user-facing slash prompt if the same bounded contract still holds.

## Suggested Skill Boundary

Keep the formal leaderboard skill scope narrow.

Safe first version:

- one score submit path
- one leaderboard identifier
- one defined ranking readback shape
- one defined runtime integration path
- one troubleshooting checklist

Unsafe first version:

- fully generic scoring architecture
- multiple leaderboard categories in one first-pass workflow
- arbitrary UI system design for rankings
- leaderboard plus unsupported storage flow
- leaderboard plus unsupported multiplayer orchestration

## Immediate Maintainer Checklist

Before anyone adds leaderboard into [skills](./skills) or [prompts](./prompts), confirm:

1. We know the user-project file target.
2. We know the leaderboard initialization or call site.
3. We know the score submit trigger.
4. We know the ranking readback target.
5. We know the auth rule.
6. We have a validation path.
7. We have failure wording that stays inside verified behavior.

If any answer is no, keep leaderboard out of the formal workflow inventory.
