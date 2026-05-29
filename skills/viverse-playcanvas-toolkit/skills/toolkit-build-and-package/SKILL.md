---
name: toolkit-build-and-package
description: "Help a user figure out whether a folder is for editing, PlayCanvas sync, or final publishing, especially when they are unsure what is safe to upload."
argument-hint: "Describe the folder you want to use and what you are trying to do with it"
---

# Toolkit Build And Package

## What This Skill Does

This skill decides what kind of folder the user actually has.

Treat the user as the end user of this workflow by default. If they invoke this skill directly, do not reinterpret the request as an instruction to inspect or modify `prompts`, `skills`, memory notes, or other customization files unless they explicitly ask for customization maintenance.

Its main job is to prevent the most common mistake: uploading the wrong folder.

## Language Rules

- Prefer "editing folder", "PlayCanvas sync folder", and "final upload folder" before terms like source workspace, asset root, or build output.
- If the user is non-technical, classify the folder for them instead of asking them to choose the category name.
- Do not start with monorepo or TypeScript jargon unless it is needed to explain why a folder is not upload-ready.
- Do not ask the user to decide whether a folder is for editing, sync, or upload. Determine that yourself and explain the result in plain language.
- Do not ask the user to decide whether publishing should use the working folder or a generated output folder. Determine the correct publishable folder yourself.
- If the user has not given enough detail to classify the folder safely, do not stop at a generic request. Include one short English fill-in template the user can copy.
- Do not inspect or edit prompt files, skill files, or memory notes just because one of those files is open in the editor. The default job of this skill is user guidance and classification, not customization maintenance.

## Core Model

Classify the user's folder into one of these categories:

### Editing Folder

Typical signs:

- contains editable project files
- often contains `src/`, config files, or development-only files
- usually needs another step before publishing

### PlayCanvas Sync Folder

Typical signs:

- is the folder meant to stay in sync with PlayCanvas
- is used for PlayCanvas local sync
- may contain scripts, textures, JSON, and other PlayCanvas content

### Final Upload Folder

Typical signs:

- is the folder meant to be uploaded to VIVERSE
- is usually created by a build or export step, **or** is hand-authored as a flat folder when the engine-only local-world path is used
- is ready to run without extra source files
- often contains runtime-facing files such as `index.html`, built assets, or static files
- may contain `manifest.json` when the folder came from a PlayCanvas Editor export, but `manifest.json` is **not** required; engine-only local worlds will not have one
- usually does not contain `src/`, `node_modules`, workspace config files, `.pcsync/`, or `pcconfig.json`

## Decision Procedure

1. Ask what folder the user plans to sync or publish.
2. Determine whether that folder is an editing folder, a PlayCanvas sync folder, or a final upload folder.
3. If it is an editing folder, stop and explain what needs to be built or exported first. If the user wants to skip the Editor entirely and build directly in a local folder, route to [viverse-engine-only-local-world](../viverse-engine-only-local-world/SKILL.md) instead.
4. If it is a PlayCanvas sync folder, route to [playcanvas-local-sync](../playcanvas-local-sync/SKILL.md).
5. If it is a final upload folder, route to [viverse-cli-publish](../viverse-cli-publish/SKILL.md).
6. If the user needs both PlayCanvas validation and VIVERSE deployment, explain the hybrid workflow explicitly.

If the folder description is vague, ask in plain language and include a short template such as `Folder: /absolute/path I want to: edit/sync/publish This folder currently contains: source files/PlayCanvas files/final built files/not sure`.

When the user is non-technical, the purpose of this skill is to remove the folder-choice burden, not to teach folder taxonomy. Name the correct folder and the next step directly.

## Classification Table

| Folder type            | Typical contents                                      | Safe next action      |
| ---------------------- | ----------------------------------------------------- | --------------------- |
| Editing folder         | `src/`, package manifests, config, development files  | Build or export first |
| PlayCanvas sync folder | scripts, textures, JSON, PlayCanvas-managed content   | Use PlayCanvas sync   |
| Final upload folder    | bundled files, runtime-ready assets, generated output | Publish to VIVERSE    |

## Common Mistakes To Catch

- user points publishing at the whole repo instead of the finished folder
- user confuses a preview app's source files with its exported output
- user treats editor extension source as publishable world content
- user assumes the same directory should always be correct for both PlayCanvas sync and VIVERSE publishing

## Practical Heuristics

- If the folder contains editable source and build configs, it is almost certainly not deployable output.
- If the folder is designed to mirror a PlayCanvas asset tree, treat it as sync input rather than deployment output.
- If the folder exists only after a build command, it is the strongest candidate for publishing.
- If the folder is empty or near-empty and the user wants to skip the PlayCanvas Editor, do not classify it as an editing folder; route to [viverse-engine-only-local-world](../viverse-engine-only-local-world/SKILL.md) so the folder can be scaffolded directly as a final upload folder.
- If the path is a zip file, it is not yet the final upload folder. The archive must be extracted first, and the extracted directory still needs classification.
- If the folder contains its main page, scene scripts, and static assets but no development workspace metadata, it is a strong candidate for the final upload folder.
- The absence of `manifest.json` does not disqualify a folder. Engine-only local worlds publish without that file.

When the user does not know which folder is correct, prefer a short explanation of these traits and ask for one or two candidate paths instead of asking them to classify the folder themselves.

## Repo-Specific Hints

- The workspace is a pnpm monorepo with Toolkit packages plus an editor extension and preview app.
- The extension build flow is documented in [apps/editor-extension/README.md](../../apps/editor-extension/README.md).
- The user-facing deployment overview is documented in [README.md](../../README.md).
- The extension publish UI distinguishes publishing modes, including a debug-oriented path, in [apps/editor-extension/src/components/PublishModeSelect.tsx](../../../apps/editor-extension/src/components/PublishModeSelect.tsx).

## Output Expectations

When using this skill, produce:

- the artifact classification
- the next required build or sync step
- the recommended downstream tool
- the main risk if the user chooses the wrong folder

If the user does not need to perform the classification manually, prefer phrasing such as "Use this folder next" or "Do not upload this folder yet" over category labels alone.

## FAQ

### What should happen before recommending VIVERSE publish?

The folder must first be classified as the final upload folder.

### What should happen before recommending playcanvas-sync?

The folder must first be confirmed as the intended PlayCanvas asset root or a sub-tree that maps cleanly into that root.

### How should Debug versus Standard be explained?

Debug is for investigation and development-oriented output. Standard is the optimized default for normal distribution.
