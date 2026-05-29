---
name: playcanvas-local-sync
description: "Help a user keep a local project folder and a PlayCanvas project in sync, with extra care for users who do not know command-line or file-format details."
argument-hint: "Describe your PlayCanvas project and the local folder you want to connect to it."
---

# PlayCanvas Local Sync

## What This Skill Does

This skill helps the user connect a local folder on their computer with a PlayCanvas project.

Treat the user as the end user of this workflow by default. If they invoke this skill directly, do not reinterpret the request as an instruction to inspect or modify `prompts`, `skills`, memory notes, or other customization files unless they explicitly ask for customization maintenance.

Use it for:

- first-time pcsync setup
- starting a watch-based sync flow
- checking why a local change did not appear in PlayCanvas
- keeping the explanation simple for users who are not programmers

## Language Rules

- Prefer "your project folder" over words like "repo", "asset root", or "workspace".
- Prefer "automatic sync" over `watch` until the exact command is needed.
- Do not lead with file extensions, `mjs`, regex, or config variable names unless a concrete problem requires them.
- If you must mention a technical term, explain it in one short phrase immediately.
- If the user appears non-technical, offer to perform the setup steps instead of listing many commands at once.
- Do not ask the user to choose an installation track, CLI invocation style, or wrapper-vs-raw command route when the safe path is already clear.
- If the required project values are known, choose the setup path yourself and continue instead of turning tool setup into a user decision.
- Start with: what this does, what is needed, and the next safe step.
- Keep compatibility notes and command variants in the background unless they are the actual blocker.
- Do not inspect or edit prompt files, skill files, or memory notes just because one of those files is open in the editor. The default job of this skill is user guidance and execution, not customization maintenance.

## Ideal Answer Shape

1. Start with 2 to 4 short sentences in plain language.
2. Explain what the setup will do for the user.
3. State the minimum information needed, or give the one next safe step if the needed values are already known.
4. Only then include the single most useful command or shortcut.
5. Do not open with a long command list, compatibility discussion, or low-level tool comparison.
6. If details are missing, ask for them in one short plain-language request instead of a long checklist.
7. If details are missing or ambiguous, include one concrete example reply shape the user can copy instead of stopping at a generic request.

Preferred opening example:

"This connects your project folder to PlayCanvas so your local changes can sync automatically. If you already know your project and folder details, I can set it up for you. After setup, you will usually just run one shortcut to start automatic sync."

If information is missing, prefer an opening like:

"I can help you set this up. I only need your PlayCanvas project and the folder you want to sync."

If the user calls the setup prompt with no usable parameters, or with wording that is too vague to map to one project, branch, or folder, do not only say that information is missing. In the same reply, give concrete guidance:

- name the most useful next details
- include one short fill-in template the user can copy
- explain one likely-confusing term in plain language if needed
- say where the user can usually find the missing PlayCanvas detail when that helps
- default those examples to English unless the user already wrote in another language

If the user clearly wants local-to-PlayCanvas sync, do not slow down the answer by comparing multiple workflow families before asking for the missing setup details.

If the required values are already known and the user is asking for setup rather than debugging, do not start by rereading helper implementation files, package metadata, or old memory notes just to reconfirm the happy path. Run the helper first with `--force --require-watch` and only inspect internals if startup still fails after the refresh.

## Expected Inputs

Collect these details before giving sync advice:

1. Which PlayCanvas project they want to sync with
2. Which PlayCanvas version or branch they want to use
3. Which local folder should stay in sync
4. Whether they already have a PlayCanvas API key
5. Whether they need ongoing automatic sync only when that changes the recommended next step

If the user does not know project ID or branch ID, help them find it instead of stopping at the technical term.

If the user gives ambiguous phrases like "the old project", "the same folder as before", or "that branch", ask for clarification in plain language and include a concrete reply template they can fill in.

When giving that template, prefer an English shape such as `Project: 1234567 Branch: your-branch-id Local folder: /absolute/path API key: your-key` unless the user has already established another language.

## Installation Strategy

Do not start with this section unless setup is blocked by a missing or outdated install.

Prefer treating `playcanvas-sync` as a machine-level helper tool rather than something the user needs to understand deeply.

Do not ask the user to choose between global install and workspace install when the safe default is already clear. Choose the default yourself and only mention the alternative when there is a concrete team requirement or blocker.

- Preferred default: install globally so `pcsync` is available directly in the shell
- Acceptable alternative: install it in a workspace only if the team intentionally wants a pinned local version and is willing to run it with `pnpm exec`

Recommended default:

```bash
npm install -g playcanvas-sync
pcsync --help
```

Workspace-scoped default:

```bash
pnpm add -Dw playcanvas-sync
pnpm exec pcsync --help
```

When advising users, prefer the global install unless there is a clear team requirement to pin the tool version inside the repo.

Important compatibility note:

- standardize new setup guidance on the npm-published install when the goal is the simplest wrapper-first setup
- assume the installed npm package uses `pcwatch` for automatic sync
- the currently published npm package may expose either `diff` or `diffAll`; the helper should prefer `diff` when available and fall back to `diffAll`
- keep helper guidance centered on those npm command names and the generated local sync shortcuts

For non-technical users, do not explain all of this unless the compatibility issue is the actual blocker.

If the agent can run the setup directly, do not turn installation strategy into a user-facing decision.

## Standard Procedure

1. Confirm the user really wants their local folder and PlayCanvas project to stay in sync.
2. Explain in plain language what will happen: local file changes can be sent to PlayCanvas automatically.
3. Tell the user the safest simple path first: the agent can do the setup and, when the required values are already known, start the generated shortcut for them.
4. If the required values are already known, prefer the repo helper with `--force --require-watch` so the agent can refresh local shortcuts and do the setup instead of making the user type everything.
5. After setup, prefer the generated local sync shortcuts for day-to-day use.
6. Treat automatic sync as the default happy path, and when setup succeeds without a blocker, prefer starting it immediately instead of stopping at instructions.
7. Only fall back to lower-level commands when troubleshooting or when the wrapper scripts are unavailable.
8. Keep the user on the wrapper-first flow. Do not redirect them to a different install track.
9. Avoid pre-setup exploration when the required values are already known. Use implementation reads only for failure recovery.

When the required values are already known, keep the user-facing interaction focused on these essentials only:

1. which project and folder will be connected
2. whether automatic sync is now running
3. what one shortcut they should use next time

## Standard Recovery Order

When the user already has a target folder and the goal is simply to get automatic sync running again, prefer this recovery order:

1. rerun `pnpm setup:playcanvas-sync -- ... --force --require-watch`
2. start the generated automatic-sync shortcut in the target folder
3. if watch starts cleanly, stop there and tell the user sync is running
4. only if that retry still fails, inspect `pcconfig.json` or the generated shortcut script
5. only inspect globally installed `playcanvas-sync` internals when one forced refresh plus one watch retry still leaves an unexplained CLI-level failure

Avoid broad pre-retry investigation in this situation. Do not start by reading `.pcsync/`, helper source, package metadata, globally installed package source, or process tables when the cheaper forced refresh plus retry path is still available.

## Repo Helper

This workspace includes a helper script for first-time setup:

```bash
pnpm setup:playcanvas-sync -- \
	--project-id <project-id> \
	--branch-id <branch-id> \
	--target-dir <absolute-target-dir> \
	--api-key <api-key> \
	--require-watch
```

Optional automatic pull:

```bash
pnpm setup:playcanvas-sync -- \
	--project-id <project-id> \
	--branch-id <branch-id> \
	--target-dir <absolute-target-dir> \
	--api-key <api-key> \
	--pull
```

The helper's `--pull` flow should run the normal `pullAll -y` first and then a best-effort extension-filtered follow-up pass so common binary files and `.viverse` content are more likely to land locally even when the npm CLI is incomplete.

Use this helper when the user already knows the required values and wants a repeatable setup path without stepping through the interactive `pcsync init` wizard.

Use `--force --require-watch` when the user's expected workflow depends on automatic sync being available and you want the helper to refresh local shortcuts first and fail fast only if `pcwatch` is missing.

The helper also writes local shortcut scripts in the target folder so users can run pull, compare, ignore, and automatic sync without retyping the full command shape.

The generated automatic-sync shortcut should start with `--force` by default so normal local/remote drift does not block startup.

When the installed CLI supports `pushAll`, the generated automatic-sync shortcut should also do a best-effort catch-up push of local changes that already existed before automatic sync started. This closes the common gap where watch mode only sees changes made after startup.

For non-technical users, prefer saying this as:

- setup creates simple local shortcuts for sync
- one shortcut starts automatic sync
- another shortcut checks what is different
- the user usually only needs the shortcut after setup, not the longer command behind it
- if setup details are already known, the agent should prefer starting the automatic sync shortcut for the user

## Decision Table

| Goal                               | Preferred command                                           | Notes                                   |
| ---------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| First-time setup with known inputs | `pnpm setup:playcanvas-sync -- ... --force --require-watch` | Best setup shortcut                     |
| Daily automatic sync               | generated automatic-sync shortcut                           | Best non-technical default              |
| Check what is different            | generated compare shortcut                                  | Safer than raw commands                 |
| Pull remote changes                | generated pull shortcut                                     | Simple local shortcut                   |
| Repeated local sync commands       | generated local sync shortcuts                              | Simple local shortcuts                  |
| Automatic sync command missing     | reinstall `playcanvas-sync`, then rerun setup               | Use this when `pcwatch` is missing      |
| One file changed locally           | let automatic sync handle it                                | Best default if sync is already running |
| Continuous local editing           | generated automatic-sync shortcut                           | Keep raw commands as troubleshooting    |
| Safe watch startup                 | generated automatic-sync shortcut                           | Starts sync with `--force` by default   |
| Verify mismatch or config          | installed diff command                                      | Prefer `diff`, fall back to `diffAll`   |
| Check ignore rules                 | installed ignore command                                    | Use `parseIgnore` on v2-style installs  |
| Push binary assets                 | `pcsync push <file>`                                        | Safest cross-version option             |

## Guardrails

- Do not assume the entire local repo should be the pcsync target directory.
- Do not recommend publishing a source folder directly to VIVERSE.
- Do not mix PlayCanvas asset-root sync advice with build-output deployment advice.
- Warn that browser-side editing on the same PlayCanvas branch can be overwritten by local watch-based sync.
- Do not overwhelm non-technical users with command alternatives if one safe path is already available.
- Do not start by explaining regex, `pcconfig.json`, or wrapper internals unless the user is debugging a problem.

## Command Patterns

Typical examples to adapt:

```bash
pnpm setup:playcanvas-sync -- --project-id 1234567 --branch-id <branch-id> --target-dir /absolute/path --api-key <api-key>
/absolute/path/.pcsync/watch.sh
/absolute/path/.pcsync/pull.sh
/absolute/path/.pcsync/diff.sh
```

For non-technical users, prefer the wrapper examples over the raw `pcsync` commands.

When giving an answer, prefer leading with only one of these wrapper commands instead of listing several at once.

When the user provides project id, branch id, target dir, and API key and clearly wants ongoing sync, prefer this execution order:

1. run the repo helper with `--force --require-watch`
2. start the generated automatic-sync shortcut
3. tell the user automatic sync is already running

Do not insert helper source reads, package.json checks, or extra watch validation between steps 1 and 2 unless step 1 fails.

If step 2 fails on an existing target folder, prefer one helper refresh plus one retry before reading `pcconfig.json` or the shortcut script.

If `watch.sh` or `pcwatch --force` prints `Started in <target-dir>` and keeps running, treat that as a healthy startup. Do not continue with process-tree inspection, package-source inspection, or extra health checks unless the user explicitly asks for deeper verification.

If the generated wrapper also prints a short catch-up push message before startup, treat that as expected behavior rather than a warning. The purpose is to push local edits that predated watch startup.

Do not use `.pcsync/diff.sh` as the primary health check for automatic sync in the current npm-published `playcanvas-sync` flow.

## Failure Signals

Use these signals to narrow the issue quickly:

- `pcsync push` completes but PlayCanvas does not show the file: likely wrong target directory, wrong branch, or ignored path
- file exists remotely but editor does not show script immediately: PlayCanvas may still need to parse it in script selectors
- binary assets never upload on bulk push: the installed CLI may not support that bulk command form or the wrong command shape was used
- watch mode causes unexpected overwrites: local and browser editing are competing on the same branch, if the installed CLI version supports watch
- the user does not understand terms like branch, API key, or target directory: slow down and convert those into plain language before continuing

## FAQ

### Should the user install playcanvas-sync with pnpm?

Usually no. Prefer global installation because `pcsync` behaves like an external synchronization utility, not like an application dependency of this monorepo.

### Why did `pcsync` use `pullAll` instead of `pull`?

Because published playcanvas-sync builds can differ. The helper prefers `diff` when available and falls back to `diffAll`, while still using command names like `pullAll` and `parseIgnore` where needed.

### Is the legacy pull or pullAll logic still necessary?

Yes. It is part of the default npm workflow and prevents the helper from giving wrong commands for the published package.

### How can the user enforce the watch-first workflow?

Use `pnpm setup:playcanvas-sync -- --require-watch ...`. That keeps the default guidance strict by requiring `pcwatch`.

### What should the user run after setup if they are not technical?

Usually just the generated local shortcut for automatic sync.

If the agent is able to run commands for the user and setup details are already known, it should usually start that shortcut instead of stopping at a manual instruction.

If the shortcut does not start immediately, prefer saying that you will refresh the local sync shortcuts and retry rather than asserting that the existing wrapper is outdated unless you have read the file and confirmed it.

### Should the user point pcsync at the repo root?

Only if the repo root is intentionally the PlayCanvas asset root. In many projects it is not.

### Should the user sync TypeScript source files directly?

Usually no. Sync the PlayCanvas-consumable output or asset tree, not arbitrary source trees, unless the project is intentionally structured that way.

### When should the user stop automatic sync?

Before performing PlayCanvas-side branch merge work, folder renames, or any browser editing on the same files. The same caution applies whether automatic sync is running through the wrapper or `pcwatch`.

## When To Escalate To Another Skill

- If the user is unsure what folder is safe to publish, use [toolkit-build-and-package](../toolkit-build-and-package/SKILL.md).
- If the user wants to publish directly to VIVERSE from a built folder, use [viverse-cli-publish](../viverse-cli-publish/SKILL.md).
- If syncing works but deployment fails, use [toolkit-publish-troubleshooting](../toolkit-publish-troubleshooting/SKILL.md).
