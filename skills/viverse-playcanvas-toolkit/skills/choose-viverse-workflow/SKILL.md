---
name: choose-viverse-workflow
description: "Help a user choose the easiest VIVERSE PlayCanvas Toolkit workflow for their current goal, especially when they are unsure which tools they actually need."
argument-hint: "Describe where you edit your world now, what you want to do next, and whether PlayCanvas is part of your workflow"
---

# Choose VIVERSE Workflow

## What This Skill Does

This skill helps the user pick the simplest path before giving detailed steps.

Treat the user as the end user of the VIVERSE workflow by default. If they invoke this skill directly, do not reinterpret the request as an instruction to maintain or rewrite `prompts`, `skills`, or other customization files unless they explicitly ask to edit those files.

Use it first when the user is unsure whether they should:

- work mainly in the PlayCanvas web editor
- work mainly in a local folder on their computer
- keep a local folder and a PlayCanvas project in sync
- build a world directly in a local folder using the PlayCanvas Engine without opening the PlayCanvas Editor
- add one leaderboard to a local world project without designing a full backend system
- add a simple multiplayer feature to a local world project without designing full matchmaking
- publish to VIVERSE without touching PlayCanvas sync at all
- upload or replace a standalone model or asset instead of publishing the world

## Language Rules

- Prefer plain language over engineering terms.
- Say "your project folder" before words like "repository" or "asset root" unless the user already uses those terms.
- Say "PlayCanvas branch (a separate saved version of the project)" when the concept matters.
- Say "the final folder you want to upload" before saying "build output".
- Do not lead with command names, file extensions, or internal package names unless they are needed for the very next action.
- Do not ask the user to compare technical routes, install steps, preview methods, or Toolkit coverage. Those choices belong to the agent.
- If one workflow is clearly safer, choose it and continue instead of presenting multiple technical options.
- If the next user step is only to open a preview URL or confirm a target folder, present that as a concrete instruction rather than a decision.
- If the user has not given enough detail to choose a path safely, do not stop at a vague request. Include one short English fill-in template the user can copy.
- Do not inspect or modify prompt files, skill files, or memory notes just because one of those files is open in the editor. The default job of this skill is user guidance, not customization maintenance.

## Quick Routing Table

| If the user says...                                         | Recommended workflow    | Primary tools                                                        |
| ----------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| "I mostly work in the PlayCanvas web editor"                | Editor-first            | PlayCanvas Editor, Toolkit extension                                 |
| "My project mostly lives in a folder on my computer"        | Local-first             | local folder, VIVERSE publish flow                                   |
| "I want to edit locally, but keep PlayCanvas updated"       | Hybrid                  | PlayCanvas sync, PlayCanvas Editor, Toolkit extension or VIVERSE CLI |
| "Build me a world in this folder, no PlayCanvas Editor"     | Engine-only local-first | local folder, PlayCanvas Engine via CDN, VIVERSE publish flow        |
| "I want to add one leaderboard to my world"                 | Local-first             | local project runtime, leaderboard skill                             |
| "I only need simple shared multiplayer in one default room" | Local-first             | local project runtime, default-room multiplayer skill                |
| "I only want to publish what I already built"               | Local-first             | local build, VIVERSE publish flow                                    |
| "I still need to check scenes or content in PlayCanvas"     | Hybrid                  | PlayCanvas sync plus PlayCanvas validation                           |

### Editor-first

Use this path when:

- the PlayCanvas web editor is the main place where the user works
- the user edits scenes and content mostly inside PlayCanvas
- the user wants the most visual flow and the fewest terminal steps

Recommend:

- PlayCanvas Editor for scene and content editing
- VIVERSE Toolkit extension for world creation, preview, and upload
- local sync only when the user clearly wants to edit files on their own computer

### Local-first

Use this path when:

- the user's main work happens in a local folder on their computer
- the user already has a folder that is meant to be uploaded or published
- the user wants the shortest route from local work to VIVERSE

Recommend:

- the local folder as the main working area
- the leaderboard path when the user wants one app ID plus one leaderboard Meta Name in a local project
- a final publish step to VIVERSE
- the default-room multiplayer path when the user only needs simple shared presence or synchronized interactions in one local world project
- PlayCanvas sync only if the PlayCanvas project really needs to stay up to date too

### Engine-only local-first

Use this path when:

- the user wants a world generated directly in a local folder
- the user does not want to open or use the PlayCanvas Editor at any step
- the user is fine with using the PlayCanvas Engine and the VIVERSE Toolkit through code

Recommend:

- the engine-only world skill so the agent can scaffold the local project and choose the correct Toolkit-first implementation route silently
- a local preview step where the agent starts the correct preview method and tells the user which URL to open
- the standard VIVERSE publish step using the agent-determined publishable folder

Do not ask the user to choose an engine version, bundler, or module system on this path. Pick safe defaults silently.

### Hybrid

Use this path when:

- the user wants to work locally but still needs PlayCanvas as part of the project flow
- the user needs both PlayCanvas checking and VIVERSE publishing

Recommend:

- PlayCanvas sync with a watch-first setup so local changes can flow into PlayCanvas
- PlayCanvas Editor for visual checking
- Toolkit extension or VIVERSE publish flow for the final release step

## Questions To Resolve First

Before going deeper, identify:

1. Where does the user mainly change content today: PlayCanvas, a local folder, or both?
2. What do they want to do next: keep editing, sync to PlayCanvas, or publish to VIVERSE?
3. Do they already have a PlayCanvas project ready?
4. Do they already have a VIVERSE world or app ready?
5. Are they asking for the easiest path, or do they already know they want local sync?
6. If this is a leaderboard request, do they already know the app ID and the Studio Meta Name that the code will use as the leaderboard key?

If the user's wording is too vague to answer those questions safely, ask in plain language and include a short template such as `Main work happens in: PlayCanvas/local folder/both Next goal: keep editing/sync/publish PlayCanvas involved: yes/no`.

Do not add questions such as "Do you want the simple route or the complete route?" or "Do you want Toolkit or custom code?" The agent should choose the implementation route.

Do not pre-read downstream skill files, prompt files, or repo memory before making the first workflow choice unless the user explicitly asked for customization maintenance or the initial route genuinely cannot be chosen without one nearby fact. The default first move is a user-facing route, not internal exploration.

## Recommended Output Format

When using this skill, return:

1. a simple workflow choice in plain language
2. one short reason it fits the user's situation
3. the next tool or helper to use
4. the immediate next action the agent should take

When the user directly invokes `/choose-viverse-workflow`, the immediate next action should be a user-facing workflow step such as asking one clarifying question, routing to one helper, or recommending one safe next action. It should not be reading or editing customization files unless the user explicitly asked for prompt or skill maintenance.

If the route is already clear, stop at the route, reason, next helper, and one immediate next action. Do not begin deep troubleshooting, package archaeology, or process inspection inside this skill.

If the user sounds non-technical, avoid presenting multiple competing routes unless there is a real decision to make.

## FAQ

### When should the user avoid PlayCanvas sync entirely?

If the user already has a final folder ready to upload and does not need PlayCanvas to stay in sync, prefer the direct local-to-VIVERSE path.

### When should the user avoid VIVERSE CLI?

If the user wants to stay inside the visual PlayCanvas flow and avoid command-line steps, prefer the existing extension upload path.

### What is the most common wrong choice?

Treating every local folder as if it were ready for both PlayCanvas sync and final publishing. First decide whether the folder is for editing, syncing, or publishing.

## Routing

After choosing the path, hand off to the matching skill:

- PlayCanvas sync setup: [playcanvas-local-sync](../playcanvas-local-sync/SKILL.md)
- Engine-only world creation in a local folder: [viverse-engine-only-local-world](../viverse-engine-only-local-world/SKILL.md)
- Build output and packaging decisions: [toolkit-build-and-package](../toolkit-build-and-package/SKILL.md)
- One-board leaderboard integration in a local project: [viverse-playcanvas-leaderboard](../viverse-playcanvas-leaderboard/SKILL.md)
- Default-room multiplayer in a local project: [viverse-default-room-multiplayer](../viverse-default-room-multiplayer/SKILL.md)
- VIVERSE CLI publishing: [viverse-cli-publish](../viverse-cli-publish/SKILL.md)
- Failure analysis: [toolkit-publish-troubleshooting](../toolkit-publish-troubleshooting/SKILL.md)

If the user replies with a follow-up such as "continue" right after a clear route, keep the next move short and workflow-specific. For PlayCanvas sync, prefer one forced refresh plus one watch retry before any deeper diagnosis.

## Repo-Specific Context

- The Toolkit already supports PlayCanvas-side world creation and upload in the editor extension.
- The main product docs describe the extension-driven flow in [README.md](../../README.md).
- Extension-specific developer context lives in [apps/editor-extension/README.md](../../apps/editor-extension/README.md).
