# VIVERSE Leaderboard Skill Review

Reference template: [viverse-skill-review-template.md](./viverse-skill-review-template.md)

## Review Summary

- Workflow name: viverse-leaderboard
- Review date: 2026-05-12
- Reviewer: GitHub Copilot
- Outcome: Ready To Promote

## 1. User Task

- Plain-language user problem: The user wants to submit scores to a global leaderboard, read ranked entries back, and show those results inside a VIVERSE world experience.
- Visible end result for the user: A player can sign in, post a score, and see leaderboard rankings or top entries reflected in the world experience.
- Why this needs its own workflow instead of reusing an existing skill: Leaderboard work combines auth, app identity, runtime integration, and score read/write behavior. The existing compose path can classify that topic, but it does not provide a bounded execution path for leaderboard-specific setup or failure handling.

## 2. Repo-Local Target

- Primary repo-local target: leaderboard executable integration artifact plus bounded governance surfaces
- Target type: helper / runtime boundary / contract
- Exact file, package, or command: [scripts/create-leaderboard-runtime-boundary.mjs](./scripts/create-leaderboard-runtime-boundary.mjs), [scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template](./scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template), [scripts/validate-leaderboard-integration.mjs](./scripts/validate-leaderboard-integration.mjs), [viverse-leaderboard-integration-contract.md](./viverse-leaderboard-integration-contract.md), [viverse-leaderboard-user-project-example.md](./viverse-leaderboard-user-project-example.md)
- Why this target is stable enough: the repo now has a real installer helper, a checked-in runtime boundary template, a prerequisite validator, a bounded downstream contract, and a real example artifact for the landing shape. The helper's refresh path has also been corrected so the installed runtime block lands in async `onReady()` rather than leaving `await` inside `createQuest()`. The installed boundary has now also passed real-runtime verification for score submit, top-entries readback, and around-user/self-rank readback.

## 3. Evidence Chain

List every major promise the workflow makes and the evidence behind it.

| Promise                                                   | Repo-local evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | External evidence                                                                                                                     | Supported now?                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| The repo has a dedicated leaderboard helper boundary      | [scripts/create-leaderboard-runtime-boundary.mjs](./scripts/create-leaderboard-runtime-boundary.mjs), [scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template](./scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template), [scripts/validate-leaderboard-integration.mjs](./scripts/validate-leaderboard-integration.mjs), [viverse-leaderboard-validator-spec.md](./viverse-leaderboard-validator-spec.md), [package.json](./package.json)                                                                                           | remote [viverse-leaderboard](https://github.com/viverseofficial/viverse-sdk-skills/tree/main/skills/viverse-leaderboard) skill exists | yes, as a bounded executable artifact          |
| The repo has a fixed user-project integration target      | [viverse-leaderboard-integration-contract.md](./viverse-leaderboard-integration-contract.md), [viverse-leaderboard-user-project-example.md](./viverse-leaderboard-user-project-example.md)                                                                                                                                                                                                                                                                                                                                                                             | remote skill describes a browser-world workflow, not this repo's project target                                                       | yes, as bounded contract                       |
| The repo can safely guide score submit and score readback | [scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template](./scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template), [scripts/create-leaderboard-runtime-boundary.mjs](./scripts/create-leaderboard-runtime-boundary.mjs), [viverse-leaderboard-user-project-example.md](./viverse-leaderboard-user-project-example.md), [viverse-leaderboard-real-runtime-test.md](./viverse-leaderboard-real-runtime-test.md), [skills/toolkit-publish-troubleshooting/SKILL.md](./skills/toolkit-publish-troubleshooting/SKILL.md) | remote skill documents `gameDashboard.getLeaderboard()` and `getGuestLeaderboard()` expectations                                      | yes, within the bounded first-version workflow |
| The repo can route leaderboard requests conservatively    | [viverse-leaderboard-readiness-spec.md](./viverse-leaderboard-readiness-spec.md), [viverse-leaderboard-promotion-review.md](./viverse-leaderboard-promotion-review.md)                                                                                                                                                                                                                                                                                                                                                                                                 | none required                                                                                                                         | yes                                            |

Approval rule:

- do not approve if any important promise has no repo-local evidence or no bounded unsupported note

## 4. Supported Scope

- First-version scope: Bound leaderboard requests to a user-project landing surface, prerequisite validation, and one submit-plus-bounded-readback workflow through the installed runtime boundary with verified real-runtime proof inside that first-version boundary.
- Specific requests this workflow should handle: conservative scoping, project-target validation, prerequisite validation, installing the leaderboard runtime boundary, and bounded planning for one score submit path plus bounded top-entries and around-user/self-rank readback shapes.
- Specific requests this workflow should handle: conservative scoping, project-target validation, prerequisite validation, installing the leaderboard runtime boundary, and bounded planning for one score submit path plus bounded top-entries and around-user/self-rank readback shapes, while distinguishing localhost preview validation from real VIVERSE runtime validation.
- Specific requests this workflow must not handle: claiming full leaderboard implementation is already proven in production, inventing SDK calls beyond the grounded adapter surfaces, inventing target files in the user's project, or implying auth and app identity wiring alone completes leaderboard functionality.
- Neighboring workflows that should receive rerouted requests: [choose-viverse-workflow](./skills/choose-viverse-workflow/SKILL.md) for broad workflow selection, [compose-toolkit-capabilities](./skills/compose-toolkit-capabilities/SKILL.md) for mixed feature decomposition, and publish/auth guidance only when the user is actually solving app identity or sign-in first.

## 5. Required Inputs

List only the minimum information required before execution.

- Required input 1: local project folder path
- Required input 2: runtime entry point or UI surface where leaderboard behavior should land
- Required input 3: leaderboard goal, such as submit score, read rankings, or display top entries
- Plain-language collection prompt: Project folder: /absolute/path Runtime entry: scripts/index.mjs or other Leaderboard goal: submit score / read rankings / show top entries
- Unknown-input threshold that forces the workflow to stop: if the project folder and runtime entry are both unknown, or if the requested leaderboard behavior still depends on unspecified auth, app identity, or runtime landing rules

## 6. Stop Conditions

The workflow must stop and ask or reroute when:

- Stop condition 1: the user project folder is unknown
- Stop condition 2: the runtime landing point for leaderboard behavior is unknown
- Stop condition 3: the request assumes broader scoreboard architecture or unbounded leaderboard UI/backend support that this repo still does not have

## 7. Guardrails

The workflow must explicitly forbid these unsupported claims:

- Guardrail 1: do not claim broader leaderboard support than the current promoted one-board workflow actually covers
- Guardrail 2: do not treat the remote leaderboard skill as proof of local implementation support
- Guardrail 3: do not invent score submission, ranking fetch, auth, or app identity wiring details that are not grounded in repo-local artifacts

## 8. Validation Path

- Cheapest concrete validation step: run [scripts/validate-leaderboard-integration.mjs](./scripts/validate-leaderboard-integration.mjs) against the user's project with app identity and leaderboard Meta Name inputs
- What it checks: whether the project target, runtime entry, repo prerequisite surfaces, app identity, leaderboard Meta Name, and first-version mode boundary are all present
- Expected pass signal: the helper reports `status: pass` for the project target and required inputs
- Expected fail signal: the helper reports a specific fail reason such as missing project target, missing runtime entry, missing app identity, missing leaderboard Meta Name, invalid leaderboard Meta Name, or unsupported scope
- Environment-mode rule: localhost preview may validate local hooks, payload construction, and UI, but real submit or readback claims require VIVERSE preview or published runtime with a directly confirmed leaderboard client

If there is no cheap validation step, the workflow is not ready.

## 9. Failure Shape

Define the bounded user-facing wording for each case.

- Missing information: ask for the local project folder, runtime entry point, and the exact leaderboard goal in one short prompt
- Missing prerequisite: explain that the repo has a bounded leaderboard validation and install path, but actual integration still depends on a confirmed project target, app identity, and leaderboard Meta Name
- Unsupported workflow: explain that broader leaderboard implementation still goes beyond the current one-board workflow boundary
- Runtime or configuration failure: debug inside the proven workflow boundary first, then stop if the request expands beyond one app ID plus one leaderboard Meta Name
- Runtime or configuration failure: debug inside the proven workflow boundary first, and distinguish localhost preview without a compatible client from VIVERSE runtime where the real client still fails, then stop if the request expands beyond one app ID plus one leaderboard Meta Name

## 10. User-Facing Language

- Preferred plain-language opening: This is mainly a leaderboard request. The repo now has a grounded leaderboard install path for one app ID plus one leaderboard Meta Name, and I can wire it into the user's project once the project target is known.
- Terms to avoid in user-facing replies: invented SDK calls, implied score API support, vague claims that auth or leaderboard setup should just work
- Internal names or file paths that should stay out of the primary answer: remote-skill file names, raw grep results, or maintainer-only governance docs

## 11. Approval Decision

Use the ready outcome.

The workflow is ready because the repo has a real installer, a real validator, a real runtime boundary template, and verified real-runtime proof for submit plus bounded top-entries and self-rank readback.

## 12. Next Action

- Immediate next action if approved: keep the user-facing workflow and related governance docs inside the current one-board boundary
