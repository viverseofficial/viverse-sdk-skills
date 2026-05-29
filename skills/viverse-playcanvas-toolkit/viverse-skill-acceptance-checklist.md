# VIVERSE Skill Acceptance Checklist

This checklist is the minimum acceptance bar for adding, restoring, or materially expanding a user-facing skill or slash prompt in this repo.

Use it before treating a workflow as supported.

The goal is to stop two failure modes:

- adding a workflow that sounds useful but has no stable repo-local execution path
- adding guidance that depends on AI-invented implementation details rather than verified capability sources

## Core Rule

A skill is only acceptable when its claims are grounded in a verified evidence chain.

That means every important claim in the workflow must be traceable to at least one of these sources:

1. an existing repo-local capability
2. an existing repo-local helper or validator
3. an existing documented implementation contract
4. a remote skill or official workflow reference that is explicitly narrowed into this repo's boundaries

If a proposed skill cannot name that chain, it is not ready.

## Cross-Cutting Preservation Principle

Use this principle for any workflow that adds a capability into an already working world.

Treat the current local behavior as a preservation baseline, not as disposable scaffolding.

The repo-level expectation is:

1. do not rewrite a working world just to add a new feature
2. use one small additive integration point instead of a new unified architecture
3. keep the existing local path working until the new path is proven ready
4. gate new prerequisites before enabling the new path
5. do not let a missing prerequisite break an existing local path that already worked
6. name at least one existing behavior that must still work after the edit
7. verify at least one preserved behavior from each directly affected slice in addition to the new feature before claiming completion

Use the following hard-stop wording when a workflow needs a shorter reusable rule block:

1. Do not rewrite a working world to add a new feature.
2. Keep the existing local path working until the new path is proven ready.
3. Gate new prerequisites before turning the new path on.
4. Do not claim completion until one old behavior and one new behavior both work.

## Acceptance Gates

All gates below should pass before the workflow is added to [skills](./skills) or [prompts](./prompts).

### Gate 1: Real User Need

Confirm the workflow solves a real user task rather than an internal categorization problem.

Pass when:

- the user task can be described in plain language
- the end state is visible to the user
- the workflow is not only a thin alias for an existing skill without added routing value

Fail when:

- the workflow mainly exists to mirror an SDK topic name
- the workflow mostly repeats broader compose behavior without sharper guidance

### Gate 2: Stable Repo-Local Target

Confirm the workflow has a stable landing surface.

Pass when at least one of these is true:

- there is an existing package or runtime surface in this repo that the workflow can safely target
- there is an existing helper command in this repo
- there is a documented downstream contract for user-project integration

Fail when:

- the workflow depends on "we can figure out the implementation later"
- the only source is a general remote SDK skill with no local target shape

### Gate 3: Evidence Chain

Confirm every core promise has traceable evidence.

Minimum evidence questions:

1. Which repo file, helper, package, or contract supports this claim?
2. Which external source, if any, adds missing workflow knowledge?
3. What part is still unsupported and therefore must remain out of scope?

Fail when any major promise depends on:

- invented SDK calls
- invented file targets
- invented lifecycle rules
- implied support that the repo does not actually have

### Gate 4: Bounded Scope

Confirm the workflow has a narrow first version.

Pass when the workflow clearly states:

- what kinds of requests it can handle
- what kinds of requests it cannot handle
- what adjacent topics must be routed elsewhere

Fail when:

- the workflow tries to cover multiple systems at once without a fixed contract
- the workflow answers too broadly to avoid saying "not supported yet"

### Gate 5: Input Contract

Confirm the workflow knows the minimum user inputs required to continue.

Pass when:

- the workflow defines the required fields
- the workflow uses plain-language collection prompts
- the workflow stops when too many required fields are unknown

Fail when:

- the workflow proceeds with major unknowns
- the workflow guesses project paths, app identity, auth state, or runtime targets

### Gate 6: Stop Conditions

Confirm the workflow has explicit stop conditions.

Pass when the skill says when it must stop and ask for clarification or reroute.

Typical stop conditions include:

- target project folder is unknown
- runtime entry point is unknown
- required helper is missing
- app identity or auth state is unknown
- the request crosses into another unsupported workflow

Fail when the workflow keeps answering by filling missing architecture with assumptions.

### Gate 6A: Target Folder Discipline

Confirm the workflow respects an explicit user-provided target folder as the implementation boundary.

Pass when:

- the workflow treats the named target folder as the only user-project implementation source by default
- sibling folders, archived copies, backups, and similarly named local folders are out of scope unless the user explicitly authorizes them as references
- the workflow uses the current Toolkit skill workspace as an explicit allowed helper/evidence exception, not as permission to pull code from another user folder
- the workflow states that this exception is limited to the current workspace's `skills/`, `prompts/`, `docs/`, `scripts/`, `packages/`, catalog, contract, checklist, and review files

Fail when:

- the workflow scans neighboring local folders to find a similar project
- the workflow copies or adapts code from another user folder without explicit authorization
- an empty target folder causes the workflow to abandon that folder and implement elsewhere

### Gate 7: Guardrails

Confirm the workflow includes explicit "do not promise" rules.

Pass when the skill forbids unsupported claims such as:

- claiming a feature is already implemented when only a concept exists
- implying cloud or multiplayer behavior without a verified path
- treating a remote workflow example as a local implementation

Fail when safety depends only on the agent "being careful" at runtime.

### Gate 8: Validation Path

Confirm there is at least one cheap, discriminating validation step.

Pass when the workflow can verify something concrete such as:

- a helper command exists
- a package or file surface exists
- a required config or catalog entry exists
- a JSON contract parses
- a lightweight prerequisite check can run

If the workflow includes local preview, also pass only when the preview path is grounded in the real target project.

Preview-specific checks:

1. the workflow says how to discover the target project's real preview command
2. if the target project has a package.json, the workflow explicitly checks its scripts before choosing a preview command
3. if the target project has a package.json, the workflow also checks dependencies or devDependencies before inferring the preview toolchain
4. the workflow runs the preview command from the target project directory, or uses an equivalent prefix or absolute-path form, instead of relying on inherited terminal cwd
5. the workflow does not rely on repo templates, copied helper folders, or stale prior preview URLs as the default preview target
6. the workflow does not invent a host or port unless the target project or dev server output provides it
7. any intentional host or port override is described as exceptional rather than normal
8. the workflow treats a long-running dev server as started once the terminal shows a ready signal such as a local URL, rather than re-running the same command after a wait timeout
9. if preview output clearly belongs to a different project, the workflow restarts from the correct target directory instead of treating that output as relevant
10. the workflow does not use a bare preview command such as `npm run dev` unless the command itself first proves the target project path
11. if the preview port is already occupied, the workflow first checks whether that process is the target project's existing preview before killing it, restarting it, or accepting a different port
12. if the occupied port already belongs to the target project's healthy preview, the workflow reuses that reported URL instead of launching a second server on another port

UI and interaction reliability checks:

1. if the workflow enables Toolkit quest UI in a bare engine-only build-step world, it explains whether the packaged UI stylesheet must also be imported
2. if the workflow relies on trigger zones or collider-backed interaction, it distinguishes real trigger bodies from ordinary rigidbody collisions instead of treating them as interchangeable
3. if the workflow creates colliders or rigidbodies in an engine-only scene, it accounts for physics-world initialization timing before those entities are created
4. if the workflow uses click or selection triggers, it checks whether the player's own collider or an enclosing collision volume can block the raycast path
5. if the workflow adds a new capability into an already working world, it identifies at least one existing behavior that must remain working after the change
6. if the workflow adds multiplayer, networking, quest expansion, or another cross-cutting feature into an existing world, it prefers additive integration over rewriting the world's bootstrap or interaction architecture
7. if the workflow introduces a new runtime prerequisite such as app identity, auth state, or multiplayer service readiness, it gates that path explicitly instead of letting the missing prerequisite break a previously working local path
8. if the workflow changes interaction, physics, triggers, selection, quest progression, or UI in an already working world, it validates at least one preserved behavior in addition to the new feature path before claiming completion

Multiplayer and service-runtime checks:

1. if the workflow relies on app identity, env config, or another service prerequisite, it verifies that the real runtime consumer receives that value instead of treating config presence as sufficient
2. if the workflow adds multiplayer or another service-backed runtime path, it does not treat build success alone as proof that runtime initialization succeeded
3. if the workflow uses a custom avatar type in multiplayer, it validates the local-avatar path and remote-avatar registration path separately

Fail when the workflow is only descriptive and has no falsifiable check.

Short reviewer wording that should also be safe to reuse in prompts or skills:

- Do not treat a new feature as permission to rewrite a working world.
- Use one small insertion point instead of a new unified architecture.
- Keep the current single-player or offline path working unless replacement is explicitly requested.
- Gate new prerequisites before enabling the new path.
- Do not let a missing multiplayer or auth prerequisite break an existing local path.
- Name at least one existing behavior that must still work after the edit.
- Verify at least one preserved behavior from each directly affected slice in addition to the new feature.
- If the blast radius grows across bootstrap, physics, UI, and interaction at once, stop and narrow the change.

Four-rule hard-stop wording:

1. Do not rewrite a working world to add a new feature.
2. Keep the existing local path working until the new path is proven ready.
3. Gate new prerequisites before turning the new path on.
4. Do not claim completion until one old behavior and one new behavior both work.

### Gate 9: Failure Shape

Confirm the workflow has bounded failure wording.

Pass when the skill can distinguish:

- missing information
- unsupported workflow
- missing prerequisite
- runtime or configuration failure

Fail when all failures collapse into vague guidance or a new round of speculative design.

### Gate 10: User-Facing Language

Confirm the workflow is phrased for the end user, not the maintainer.

Pass when:

- the skill describes product actions in plain language
- internal file names and scaffold labels are not the primary user guidance
- the skill does not assume the user wants to maintain prompt files just because a customization file is open

Fail when:

- the answer reads like internal repo maintenance instructions
- the user is pushed into implementation detail before the workflow is clear

## Required Evidence Table

Before approval, fill in a table like this for the proposed workflow.

| Item              | Required answer                                                    |
| ----------------- | ------------------------------------------------------------------ |
| User task         | What plain-language problem does this skill solve?                 |
| Repo-local target | Which package, file surface, helper, or contract does it land on?  |
| External source   | Which remote skill or official guidance informs the workflow?      |
| Supported scope   | What does the first version definitely cover?                      |
| Unsupported scope | What must remain out of scope?                                     |
| Required inputs   | What must the user provide before execution?                       |
| Stop conditions   | When must the workflow stop or reroute?                            |
| Validation        | What can be checked immediately?                                   |
| Failure wording   | How will missing prerequisites and unsupported cases be explained? |

Do not approve the workflow if any row is blank.

## Review Outcome Labels

Use one of these labels during review.

### Ready

All gates pass.

The workflow may be added as a formal skill, and optionally as a slash prompt if the user-facing path is stable.

### Draft Only

The workflow has useful wording or routing value but is missing one or more of:

- stable repo-local target
- helper or downstream contract
- validation path
- bounded failure shape

Keep it in design notes or implementation planning only. Do not publish it as a supported skill.

### Not Ready

The workflow depends on speculative implementation, missing architecture, or broad unsupported claims.

Do not add it to the formal workflow inventory.

## Anti-Hallucination Review Questions

Ask these questions before approving any new skill.

1. If the user asks "where does this actually land in my project?" can we answer precisely?
2. If the user asks "what existing repo capability makes this real?" can we name it?
3. If the user omits critical context, does the workflow stop instead of guessing?
4. If the workflow fails, do we know whether it failed because of missing info, missing support, or runtime problems?
5. Are we accidentally turning "should do" guidance into "already supported" guidance?
6. If the workflow starts local preview, does it first derive the command and URL from the user's actual project instead of a repo template or guessed port?
7. If the target project has a package.json, does the workflow verify scripts and dependency evidence before assuming a preview stack such as Vite or another dev server?
8. If the preview command is a long-running dev server, does the workflow avoid re-running it after a timeout once a ready signal is already present?

If any answer is no, the workflow is not yet safe.

## Recommended Rollout Order

Use this order when adding a new workflow area.

1. Prove the repo-local target.
2. Define the input contract.
3. Define stop conditions and guardrails.
4. Add a helper or downstream implementation contract.
5. Add a validation step.
6. Add the formal skill.
7. Only then consider a user-facing slash prompt.

This order is preferred because it makes unsupported behavior explicit before user-facing packaging exists.

## Related Documents

- [toolkit-capability-catalog.md](./toolkit-capability-catalog.md)
- [viverse-nontechnical-user-ux-checklist.md](./viverse-nontechnical-user-ux-checklist.md)
- [viverse-external-facing-deidentification-checklist.md](./viverse-external-facing-deidentification-checklist.md)
- [viverse-storage-readiness-spec.md](./viverse-storage-readiness-spec.md)
