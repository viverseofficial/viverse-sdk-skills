---
name: toolkit-publish-troubleshooting
description: "Troubleshoot VIVERSE PlayCanvas Toolkit sync and deployment issues. Use when local build, playcanvas-sync, PlayCanvas upload, or VIVERSE CLI publishing fails due to wrong paths, wrong app IDs, missing assets, invalid output folders, or mismatched workflow assumptions."
argument-hint: "Describe the failing step, the command or UI action, and what result you expected"
---

# Toolkit Publish Troubleshooting

## What This Skill Does

This skill narrows failures across the full local to PlayCanvas to VIVERSE pipeline.

Treat the user as the end user of this workflow by default. If they invoke this skill directly, do not reinterpret the request as an instruction to inspect or modify `prompts`, `skills`, memory notes, or other customization files unless they explicitly ask for customization maintenance.

When the user appears non-technical:

- restate the failing step in plain language before diagnosing it
- say "the folder you uploaded" before saying "artifact" or "build output"
- say "your VIVERSE world/app" before saying "app ID" unless the exact ID is needed
- ask for the smallest missing detail instead of a large technical dump
- do not ask the user to decide which workflow family, publish route, or folder category applies if the failure context already makes that clear
- infer the likely failing folder or route first, then ask only for the missing detail that would change the diagnosis
- if details are missing or ambiguous, include one short English fill-in template the user can copy instead of stopping at a generic request
- do not inspect or edit prompt files, skill files, or memory notes just because one of those files is open in the editor. The default job of this skill is user troubleshooting guidance, not customization maintenance

Use it when the user reports:

- sync succeeded but the right files are not in PlayCanvas
- VIVERSE CLI publish succeeded but the content is broken
- Upload to VIVERSE from the Toolkit extension is not behaving as expected
- the wrong app, branch, or content folder is being targeted
- a leaderboard attempt is blocked by missing app identity, missing auth state, or a missing leaderboard Meta Name

## Failure Domains

Classify the issue before suggesting fixes.

### Configuration Failure

- wrong PlayCanvas project ID or branch ID
- wrong VIVERSE app ID
- not logged into the required platform

### Folder Or Content Failure

- source folder used as publish path
- build output missing required assets
- PlayCanvas asset root and deployment output confused with each other

### Sync Failure

- `pcignore.txt` excluded the intended files
- watch mode and browser editing conflicted
- binary assets were omitted because no extension or regex filter was provided
- automatic sync started after local edits already existed, so the user assumed watch startup would backfill those older changes automatically

### Platform Flow Failure

- user expected VIVERSE CLI publish to replace Studio review
- user expected playcanvas-sync to publish directly to VIVERSE
- user expected PlayCanvas upload state to match VIVERSE deployment state automatically

### Leaderboard Prerequisite Failure

- app identity for the target world is missing or mismatched
- the user is not signed in for a leaderboard path that needs auth
- the leaderboard name or key is missing
- the user assumes the current one-board helper boundary covers broader leaderboard architecture than it actually does

## Troubleshooting Procedure

1. Identify the exact failing step.
2. Confirm the target system for that step: local build, PlayCanvas sync, Toolkit extension upload, or VIVERSE publish.
3. Inspect the path, ID, and authentication inputs.
4. Determine whether the folder is for editing, PlayCanvas sync, or final publishing.
5. Only then suggest the smallest corrective action.

For PlayCanvas sync startup failures, prefer one short corrective cycle before deep diagnosis: force-refresh local sync setup, retry the generated watch shortcut, and only then inspect wrapper contents or installed package internals if the retry still fails.

For "watch started but my earlier local changes never appeared remotely" cases, first verify whether those edits existed before automatic sync was started. If so, prefer a refreshed wrapper that performs a best-effort catch-up push before watch startup, or do one targeted push for the missing files.

For leaderboard-related failures, stay inside prerequisite troubleshooting first: confirm the project folder, runtime target, app identity, auth state, and leaderboard Meta Name before discussing implementation details. If the request fits one app ID plus one leaderboard Meta Name with submit or bounded readback, hand off to the formal leaderboard workflow. If the request depends on broader scoreboard architecture, stop and explain that it still goes beyond the current leaderboard boundary.

Do not start PlayCanvas sync troubleshooting by reading globally installed `playcanvas-sync` source files, internal utils such as `get-config.js`, or process tables when a forced refresh plus one watch retry is still available.

## Fast Triage Table

| Symptom                                               | Most likely category             | First check                                    |
| ----------------------------------------------------- | -------------------------------- | ---------------------------------------------- |
| Files never appear in PlayCanvas                      | Sync failure                     | target dir, branch id, `pcignore.txt`          |
| Watch started but earlier local edits never appeared  | Sync failure                     | whether the edits existed before watch startup |
| Publish succeeds but app content is broken            | Folder or content failure        | uploaded folder is the wrong one               |
| Wrong world updated                                   | Configuration failure            | app ID                                         |
| User expects VIVERSE release immediately after upload | Platform flow failure            | Studio review expectations                     |
| Local and remote differ unexpectedly during watch     | Sync failure                     | simultaneous editing and current branch        |
| Leaderboard cannot submit or read rankings            | Leaderboard prerequisite failure | app identity, auth state, leaderboard Meta Name      |

## Minimal Question Set

Ask these before diving deeper:

1. Which step failed exactly?
2. What command or UI action was used?
3. What folder was involved, if it is not already clear from the failure context?
4. What ID was supplied, if any?
5. What result was expected instead?

If the user does not give enough detail to answer those questions, ask in plain language and include a short template such as `Failed step: sync/upload/publish Command or action: ... Folder or file: /absolute/path ID used: ... Expected result: ...`.

If the folder or route can already be inferred safely from the command, UI action, or prior context, do that first and avoid asking the user to classify it.

## FAQ

### What is the most common deployment mistake?

Publishing the editing folder instead of the final upload folder.

### What is the most common sync mistake?

Using the wrong local root or assuming `pcsync` will include files that are excluded by ignore rules.

Another common mistake is assuming that starting automatic sync later will always backfill local changes that already existed before watch startup. In the wrapper-first flow, that catch-up behavior now depends on the generated wrapper and installed CLI support.

For leaderboard attempts, another common mistake is assuming publish success alone proves leaderboard readiness. App targeting may be correct while auth state, leaderboard Meta Name, or the actual runtime landing point are still missing.

### What is the most common workflow mistake?

Assuming playcanvas-sync, Toolkit extension upload, and VIVERSE CLI are interchangeable. They operate at different stages.

## Routing

- Workflow choice unclear: [choose-viverse-workflow](../choose-viverse-workflow/SKILL.md)
- PlayCanvas sync issue: [playcanvas-local-sync](../playcanvas-local-sync/SKILL.md)
- Build artifact issue: [toolkit-build-and-package](../toolkit-build-and-package/SKILL.md)
- VIVERSE CLI issue: [viverse-cli-publish](../viverse-cli-publish/SKILL.md)

If the user specifically wants a dedicated leaderboard implementation workflow and the request stays within one app ID plus one leaderboard Meta Name, hand off to [viverse-playcanvas-leaderboard](../viverse-playcanvas-leaderboard/SKILL.md). If the request exceeds that boundary, keep the answer inside prerequisite troubleshooting and current governance boundaries.
