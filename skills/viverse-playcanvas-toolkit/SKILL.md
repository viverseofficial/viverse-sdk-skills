---
name: viverse-playcanvas-toolkit
description: "Bundle entry for the exported VIVERSE PlayCanvas Toolkit workflow pack. Use when you want bundled VIVERSE PlayCanvas Toolkit skills, prompts, catalogs, and helper assets in one standalone package."
user-invocable: false
---

# VIVERSE PlayCanvas Toolkit Skills Bundle

## What This Skill Does

This file is the root entry for the exported standalone workflow pack.

Use this bundle when you want the VIVERSE PlayCanvas Toolkit skills and prompts together with the supporting assets required by the stronger workflows.

Treat this file as a routing and context entry, not as the place to perform deep task-specific guidance itself.

When a downstream workflow is clearly identifiable, hand off to the matching bundled skill or prompt instead of answering from this file alone.

## When To Use This Bundle Entry

Use this file when one or more of these are true:

1. the user opened the exported bundle and needs the shortest safe starting point
2. the user wants to know which included workflow to invoke
3. the user needs to understand whether the bundle is self-contained enough for their task
4. the agent needs a top-level inventory of the bundled skills, prompts, and supporting assets

Do not stay here longer than necessary. Once the correct workflow is known, route there.

## What This Bundle Includes

1. bundled skills under `./skills/`
2. bundled prompts under `./prompts/`
3. bundled capability catalogs
4. bundled helper scripts and templates
5. bundled contracts, review notes, and runtime test references

## Routing Rules

Choose the narrowest workflow that directly matches the user's goal.

1. If the user is unsure which workflow fits, start with [workflow chooser](./skills/choose-viverse-workflow/SKILL.md).
2. If the user wants a feature plan for a scene or world request, use [compose prompt](./prompts/compose-viverse-feature.prompt.md).
3. If the user wants to scaffold a world directly in a local folder without the PlayCanvas Editor, use [viverse-engine-only-local-world](./skills/viverse-engine-only-local-world/SKILL.md).
4. If the user wants to keep a local project folder and PlayCanvas in sync, use [playcanvas-local-sync](./skills/playcanvas-local-sync/SKILL.md).
5. If the user needs to determine whether a folder is for editing, sync, or final upload, use [toolkit-build-and-package](./skills/toolkit-build-and-package/SKILL.md).
6. If the user wants to publish a final build to VIVERSE, use [viverse-cli-publish](./skills/viverse-cli-publish/SKILL.md).
7. If the user wants a bounded leaderboard integration in one app, use [viverse-playcanvas-leaderboard](./skills/viverse-playcanvas-leaderboard/SKILL.md).
8. If the user wants bounded default-room multiplayer in one local world, use [viverse-default-room-multiplayer](./skills/viverse-default-room-multiplayer/SKILL.md).
9. If the user is already blocked by sync, packaging, upload, or publish failures, use [toolkit-publish-troubleshooting](./skills/toolkit-publish-troubleshooting/SKILL.md).

## Output Expectations

When this bundle entry is consulted, the response should usually contain:

1. the best-fit bundled workflow or prompt
2. one short reason that route fits
3. the immediate next action

Avoid broad repo archaeology from this file unless the user explicitly asks about bundle contents, portability, or what is included.

## Start Here

1. Read [INSTALL.md](./INSTALL.md) for the shortest setup path.
2. Read [README.md](./README.md) for bundle installation and trust-level notes.
3. Use [workflow chooser](./skills/choose-viverse-workflow/SKILL.md) as the main routing entry.
4. Use [compose prompt](./prompts/compose-viverse-feature.prompt.md) for scene and feature requests.

## Main Workflows

1. [choose-viverse-workflow](./skills/choose-viverse-workflow/SKILL.md)
2. [compose-toolkit-capabilities](./skills/compose-toolkit-capabilities/SKILL.md)
3. [playcanvas-local-sync](./skills/playcanvas-local-sync/SKILL.md)
4. [viverse-engine-only-local-world](./skills/viverse-engine-only-local-world/SKILL.md)
5. [toolkit-build-and-package](./skills/toolkit-build-and-package/SKILL.md)
6. [toolkit-publish-troubleshooting](./skills/toolkit-publish-troubleshooting/SKILL.md)
7. [viverse-cli-publish](./skills/viverse-cli-publish/SKILL.md)
8. [viverse-default-room-multiplayer](./skills/viverse-default-room-multiplayer/SKILL.md)
9. [viverse-playcanvas-leaderboard](./skills/viverse-playcanvas-leaderboard/SKILL.md)

## Bundle Boundaries

Some workflows in this bundle are guidance-first.

Some workflows remain grounded only because this bundle carries the supporting catalogs, scripts, templates, contracts, and source evidence together with the skill text.

Do not imply that copying only `skills/` and `prompts/` is enough for the stronger workflows.

If the user asks whether the bundle can be merged into another workspace, point them to [README.md](./README.md) and preserve the bundled relative paths.

## Repo-Specific Context

1. This repository packages both user-facing workflows and the supporting assets those workflows depend on.
2. The strongest grounded workflows in this bundle are the engine-only local world path, leaderboard integration, default-room multiplayer, and capability composition.
3. Maintainer notes, validation scripts, and supporting contracts are intentionally shipped with the bundle so downstream workflows can stay concrete.
