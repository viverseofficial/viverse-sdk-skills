# VIVERSE Skill Review Template

Use this template when proposing a new skill, restoring a removed skill, or materially expanding an existing workflow.

If any required section cannot be filled with verified information, the workflow is not ready for the formal inventory.

Reference checklist: [viverse-skill-acceptance-checklist.md](./viverse-skill-acceptance-checklist.md)

When the workflow adds a capability into an already working world, also review it against the checklist's Cross-Cutting Preservation Principle.

## Review Summary

- Workflow name:
- Review date:
- Reviewer:
- Outcome: Ready / Draft Only / Not Ready

## 1. User Task

- Plain-language user problem:
- Visible end result for the user:
- Why this needs its own workflow instead of reusing an existing skill:

## 2. Repo-Local Target

- Primary repo-local target:
- Target type: package / helper / contract / other
- Exact file, package, or command:
- Why this target is stable enough:

## 3. Evidence Chain

List every major promise the workflow makes and the evidence behind it.

| Promise                                    | Repo-local evidence                         | External evidence     | Supported now? |
| ------------------------------------------ | ------------------------------------------- | --------------------- | -------------- |
| Example: user can publish a finished world | scripts/publish-build-output-to-viverse.mjs | official publish docs | yes            |
|                                            |                                             |                       |                |
|                                            |                                             |                       |                |

Approval rule:

- do not approve if any important promise has no repo-local evidence or no bounded unsupported note

Preview-specific approval note:

- if the workflow starts local preview for an existing project, include the package.json evidence used to choose the command and toolchain when that file exists
- if the workflow starts a long-running dev server, include the ready signal that proves startup succeeded and explain when the workflow should inspect runtime output instead of retrying the same command
- if the workflow starts local preview in a persistent terminal, include how it guarantees the command runs from the target project directory rather than an inherited cwd from another repo
- if the workflow uses npm, pnpm, or yarn for preview, include the exact command form and explain why it cannot accidentally start another project from inherited cwd
- if the expected preview port is already occupied, include the evidence used to determine whether that process is the target project's existing preview, a wrong-project conflict, or a stale process before killing it, restarting it, or reusing it

Service-runtime approval note:

- if the workflow depends on app identity, env config, networking, or another service-backed runtime path, include the evidence that the real runtime consumer receives that value rather than only showing config-file presence
- if the workflow uses custom avatars in multiplayer, include separate evidence for the local-avatar path and the remote-avatar registration path

## 4. Supported Scope

- First-version scope:
- Specific requests this workflow should handle:
- Specific requests this workflow must not handle:
- Neighboring workflows that should receive rerouted requests:

## 5. Required Inputs

List only the minimum information required before execution.

- Required input 1:
- Required input 2:
- Required input 3:
- Plain-language collection prompt:
- Unknown-input threshold that forces the workflow to stop:

## 6. Stop Conditions

The workflow must stop and ask or reroute when:

- Stop condition 1:
- Stop condition 2:
- Stop condition 3:

## 7. Guardrails

The workflow must explicitly forbid these unsupported claims:

- Guardrail 1:
- Guardrail 2:
- Guardrail 3:
- Guardrail 4: explicit target folder does not authorize scanning sibling folders or reusing code from another local user project without user approval
- Guardrail 4A: the current Toolkit skill workspace may be used as an explicit helper/evidence exception, but that exception must be limited to this workspace's own `skills/`, `prompts/`, `docs/`, `scripts/`, `packages/`, catalog, contract, checklist, and review files
- Guardrail 5: the new feature does not authorize rewriting a working world or replacing the current local path before the new path is proven ready
- Guardrail 6: missing prerequisites do not break an existing local path that already worked

## 8. Validation Path

- Cheapest concrete validation step:
- What it checks:
- Expected pass signal:
- Expected fail signal:
- If local preview is part of the workflow, what package.json evidence is checked before choosing the preview command?
- If local preview is part of the workflow, what terminal ready signal proves the dev server started, and what prevents the workflow from re-running the same command after timeout?
- If local preview is part of the workflow, what proves the command ran in the target project directory instead of another workspace or repo?
- If local preview uses npm, pnpm, or yarn, what prevents a bare command from being run in the wrong cwd?
- If the workflow extends an already working world, what preserved behavior must still work after the edit, and how is that checked?
- If the workflow depends on app identity, env config, or another service-backed runtime path, what proves the real runtime consumer received that value?
- If the workflow uses custom avatars in multiplayer, what proves the remote-avatar path works independently of the local-avatar path?

If there is no cheap validation step, the workflow is not ready.

## 9. Failure Shape

Define the bounded user-facing wording for each case.

- Missing information:
- Missing prerequisite:
- Unsupported workflow:
- Runtime or configuration failure:

## 10. User-Facing Language

- Preferred plain-language opening:
- Terms to avoid in user-facing replies:
- Internal names or file paths that should stay out of the primary answer:

## 11. Approval Decision

### Ready

Use only if all of the following are true:

- the repo-local target is stable
- the evidence chain is complete
- stop conditions are explicit
- guardrails are explicit
- a cheap validation step exists

### Draft Only

Use when the workflow has value but is still missing one of:

- stable repo-local target
- helper or downstream contract
- validation path
- bounded failure wording

### Not Ready

Use when the workflow still depends on speculative implementation or invented support.

## 12. Next Action

- Immediate next action if approved:
- Immediate next action if draft only:
- Immediate next action if not ready:
