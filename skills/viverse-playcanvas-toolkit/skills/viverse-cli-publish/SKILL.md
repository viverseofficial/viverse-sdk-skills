---
name: viverse-cli-publish
description: "Publish a PlayCanvas Toolkit local build to VIVERSE via CLI. Only for projects using viverse-playcanvas-toolkit, not for general VIVERSE world publishing."
argument-hint: "Describe the finished folder you want to upload and whether you already have a VIVERSE world/app."
---

# VIVERSE CLI Publish

## What This Skill Does

This skill covers publishing a finished local folder to VIVERSE for projects that use viverse-playcanvas-toolkit.

Do not use this as a general VIVERSE world publishing workflow outside the Toolkit local-build path.

Treat the user as the end user of this workflow by default. If they invoke this skill directly, do not reinterpret the request as an instruction to inspect or modify `prompts`, `skills`, memory notes, or other customization files unless they explicitly ask for customization maintenance.

Use it when the user wants to:

- authenticate with VIVERSE CLI
- create or inspect VIVERSE apps
- publish a finished local folder
- integrate publishing into a scripted local workflow or CI/CD flow

## Language Rules

- Prefer "the finished folder you want to upload" before saying "build output".
- Prefer "your VIVERSE world/app" before saying "app ID" unless the ID is immediately needed.
- Do not start with `@viverse/cli`, `pnpm exec`, or auth subcommands unless the user already knows they want the command-line path.
- If the user sounds non-technical, offer the shortest safe publish path first.
- Do not ask the user to choose a technical publish route when the safe path is already clear. Choose it and continue.
- Do not ask the user to reason about installation strategy, CLI runner choice, or whether a build output folder is needed. Determine those yourself.
- When the user only needs to open a preview URL or confirm a target world, phrase that as a concrete instruction rather than a technical question.
- If information is missing or ambiguous, do not stop at a generic request. Include one short English fill-in template the user can copy.
- Do not inspect or edit prompt files, skill files, or memory notes just because one of those files is open in the editor. The default job of this skill is user guidance and execution, not customization maintenance.
- Do not ask the user to manually provide their Node version in normal publish flows. Verify environment prerequisites yourself when tools are available, and only mention Node version if it is the actual blocker.
- Do not cite implementation files such as `PublishExtension.tsx`, source paths, or code-level internals to non-technical users as primary guidance. Describe the capability in product terms instead.

If the user gives too little detail, or uses vague wording like "that folder" or "the existing world", ask for clarification in plain language and include a concrete template such as `Folder: /absolute/path Existing app: yes/no App ID: your-app-id App name: My World`.

If the correct upload folder can already be inferred safely from the environment, do that first and ask only for the missing business decision, such as whether to publish to an existing world or create a new one.

## Required Checks

Before giving publish commands, verify:

1. The folder is the final upload-ready folder, not a source-code folder.
2. The user knows whether they are publishing to an existing app or creating a new one.
3. The user has Node.js new enough for the CLI.
4. The user understands that uploading content is not the same as final public release in Studio.
5. The user is actually publishing a world or app, not uploading a standalone asset.

The Node.js version check is an agent-side prerequisite check, not a user input field. Prefer checking it directly in the environment instead of asking the user to look it up.

If the user does not know whether the folder is upload-ready, route them to [toolkit-build-and-package](../toolkit-build-and-package/SKILL.md) before giving publish commands.

When the folder is the main uncertainty, do not stop at "I need the folder path". Explain what usually counts as a final upload folder:

- it is a folder, not a zip file
- it is meant to run directly after upload
- it usually looks like a finished world folder rather than a working project folder
- it usually does not contain development-only files such as source folders, dependency folders, or workspace config files
- it is often produced by a build, export, or packaging step rather than being the original editing folder

If the user is unsure which folder qualifies, prefer one short plain-language explanation plus one concrete request such as:

`Candidate folders: /absolute/path/one ; /absolute/path/two`

or:

`Folder: /absolute/path This folder looks like: finished world files / working project files / not sure`

## Installation Strategy

`@viverse/cli` can be treated either as a machine-level tool or as a workspace dependency.

- Prefer workspace installation when the repo or team wants a consistent CLI version for project workflows
- Prefer global installation when the user mainly wants a personal machine-wide publishing tool

Workspace-oriented option:

```bash
pnpm add -w @viverse/cli
pnpm exec viverse-cli auth status
```

Machine-wide option:

```bash
npm install -g @viverse/cli
viverse-cli auth status
```

For non-technical users, do not dwell on installation strategy unless publishing is blocked by a missing tool.

If the agent can complete the publish flow directly, do not turn CLI installation or runner choice into a user-facing decision.

## Standard Procedure

1. Confirm the folder the user wants to upload.
2. If the user already knows the finished folder path and publish target, prefer the repo helper `pnpm publish:viverse -- ...`.
3. Otherwise, check login status or log in.
4. If the app already exists, obtain or confirm the app ID.
5. If the app does not exist yet, choose auto-create flow.
6. Publish from the final upload-ready folder.
7. After a successful upload, explicitly tell the user that upload is not the final public release step and include direct links to [VIVERSE Studio](https://studio.viverse.com/) and [How to Publish](https://docs.viverse.com/how-to-publish).

When the user needs an app ID and has already provided the other required publish details, prefer creating the target app through the CLI auto-create flow instead of sending the user to Studio just to create the app manually.

Do not send the user to Studio as the primary path for obtaining an app ID when this publish workflow can create the target app directly.

When the user is non-technical, keep the user-facing interaction focused on these essentials only:

1. which finished folder will be uploaded
2. whether it goes to an existing world or a new one
3. what the next Studio step is after upload

When the missing detail is simply "which folder" or "which app", prefer asking in one short plain-language sentence and include one short English reply shape the user can copy.

## Post-Upload Follow-Up

When upload succeeds, do not end with a vague note such as "continue in Studio".

Use a short plain-language follow-up that makes the next action obvious:

- say that the upload is complete, but not fully published yet
- link directly to [VIVERSE Studio](https://studio.viverse.com/)
- link to the official [How to Publish](https://docs.viverse.com/how-to-publish) guide as the fallback reference
- tell the user to open their world in Studio, check the uploaded version, preview it, and submit it for review

Preferred shape:

"Your upload is complete, but it is not fully published yet. Continue in [VIVERSE Studio](https://studio.viverse.com/) to open your world, check the uploaded version, preview it, and submit it for review. If you want the official step-by-step guide, see [How to Publish](https://docs.viverse.com/how-to-publish)."

When the user does not know which folder is safe to upload, prefer this order:

1. explain the typical traits of a final upload folder in one short paragraph
2. name one or two clear disqualifiers such as zip files, `src`, `node_modules`, or PlayCanvas sync folders
3. ask for one candidate path or two candidate paths
4. only after that, classify the candidate and continue with publish

When explaining the folder choice to non-technical users, prefer product-facing wording such as "the folder that should run after upload" or "the finished folder". Avoid relying on programming terms unless they are necessary to disqualify a path.

## Repo Helper

This workspace includes a helper script for common publish flows:

```bash
pnpm publish:viverse -- \
	--path <build-output-dir> \
	--app-id <app-id>
```

Auto-create flow:

```bash
pnpm publish:viverse -- \
	--path <build-output-dir> \
	--auto-create-app \
	--name <app-name>
```

Optional flags:

- `--description <text>` for auto-create
- `--login` to run interactive login if auth check fails
- `--dry-run` to print the resolved publish command without executing it

Use this helper when the user already has a valid finished folder and wants a repeatable repo-oriented publish path.

For non-technical users, present this helper as "the shortcut that uploads your finished folder to VIVERSE".

## Decision Table

| Situation                                | Recommended path              |
| ---------------------------------------- | ----------------------------- |
| Folder and target already known          | `pnpm publish:viverse -- ...` |
| User is not authenticated                | log in first                  |
| User has an existing app                 | publish to that app           |
| User needs a new app                     | use CLI auto-create flow      |
| User only knows the app name, not the ID | list apps first               |

## Command Patterns

```bash
pnpm publish:viverse -- --path dist --app-id <app-id>
pnpm publish:viverse -- --path dist --auto-create-app --name "My App"
pnpm publish:viverse -- --path dist --app-id <app-id> --dry-run

pnpm add -w @viverse/cli
pnpm exec viverse-cli auth status
pnpm exec viverse-cli auth login
pnpm exec viverse-cli app list
pnpm exec viverse-cli app create --name "My App"
pnpm exec viverse-cli app publish dist --app-id <app-id>
pnpm exec viverse-cli app publish dist --auto-create-app --name "My App"

npm install -g @viverse/cli
viverse-cli auth login
viverse-cli auth status
viverse-cli app list
viverse-cli app create --name "My App"
viverse-cli app publish dist --app-id <app-id>
viverse-cli app publish dist --auto-create-app --name "My App"
```

## Failure Signals

- publish command accepts the path but runtime content is broken: likely wrong folder, often source instead of the finished upload folder
- user has upload success but cannot find a public page: Studio review or follow-up publish steps may still be required
- app publish fails unexpectedly: confirm login state, CLI version, app ID, and path

## FAQ

### Should the user install `@viverse/cli` with pnpm?

Yes, that is a reasonable default for this workspace if the goal is to keep the CLI version aligned with the repo workflow. In that case, use `pnpm exec viverse-cli ...`.

### What path should be published?

Only the final folder that is meant to run in VIVERSE. Never publish a source-code folder, a dependency folder, or an unbuilt monorepo root.

Typical good signs are a finished world page plus its assets. Typical bad signs are source folders, dependency folders, PlayCanvas sync metadata, or an entire unbuilt workspace.

### When should the user prefer the Toolkit extension over VIVERSE CLI?

When they want the PlayCanvas Editor-native upload flow and are already working inside that editor-centric model.

Explain this as "the built-in Upload to VIVERSE flow inside the PlayCanvas-side toolkit experience" rather than pointing the user at implementation files.

### Can VIVERSE CLI replace PlayCanvas sync?

No. VIVERSE CLI deploys the finished upload folder to VIVERSE apps. It does not synchronize a local folder with a PlayCanvas branch.

## Guardrails

- Never suggest publishing `src`, `node_modules`, or an unbuilt workspace.
- If the user only has PlayCanvas assets and no finished upload folder yet, route to [playcanvas-local-sync](../playcanvas-local-sync/SKILL.md) or [toolkit-build-and-package](../toolkit-build-and-package/SKILL.md).
- If the user mainly wants to upload or replace a `.glb`, `.obj`, or `.zip` asset, say that this is an asset upload task rather than a world publish task.
- If the user wants to stay fully inside PlayCanvas Editor, mention the existing Toolkit extension upload flow instead of forcing CLI.
- If the user is non-technical, prefer the helper path before raw command sequences.

## Repo-Specific Context

- The existing extension already exposes an Upload to VIVERSE flow in [apps/editor-extension/src/components/PublishExtension.tsx](../../../apps/editor-extension/src/components/PublishExtension.tsx).
- The main user-facing docs mention the extension-based upload path in [README.md](../../README.md).

Do not surface these file references to end users unless they explicitly ask where the behavior is implemented in the codebase.
