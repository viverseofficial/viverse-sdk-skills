---
name: Sync And Publish VIVERSE Project
description: "Help a user choose the easiest path from their local project or PlayCanvas project to a published VIVERSE world."
argument-hint: "Describe where your world is now, whether PlayCanvas is part of it, and what you want to publish"
agent: "agent"
---

Plan the correct workflow for taking a local VIVERSE PlayCanvas Toolkit project from development to deployment.

Treat the user as the end user of this workflow by default. If they invoke this prompt directly, do not reinterpret the request as an instruction to inspect or modify `prompts`, `skills`, memory notes, or other customization files unless they explicitly ask for customization maintenance.

Response style:

- Start with the user's goal in plain language.
- Prefer a short next-step plan over a broad workflow lecture.
- If one side of the workflow is clearly the immediate need, focus on that side first.
- Only introduce terms like build output, asset root, CLI, or branch when they are needed for the next action.
- Do not inspect or edit prompt files, skill files, or memory notes just because one of those files is open in the editor. The default job of this prompt is user guidance and execution, not customization maintenance.

Ideal answer shape:

1. Start with 2 to 4 short sentences that restate the user's goal in plain language.
2. Identify the one immediate path: sync to PlayCanvas, publish to VIVERSE, or do both in sequence.
3. Give the next safe step.
4. Only then include the single most useful helper command if it is immediately actionable.

Preferred opening example:

"I can help you move this project toward a published VIVERSE world. First we should confirm whether you need to keep a project folder in sync with PlayCanvas, publish a finished folder to VIVERSE, or do both in order. Once that is clear, I can give you the shortest safe path forward."

If the user calls `/Sync-And-Publish-VIVERSE-Project` with no usable details, or with wording that is too vague to tell whether they need sync, publish, or both, do not reply with only a broad request for more information. Give concrete guidance in the same reply:

- name the most useful next details
- include one short English fill-in example the user can copy
- explain one likely-confusing workflow term in plain language if needed
- say what kind of answer would let you choose the next safe step

Preferred fallback example when the input is too thin or ambiguous:

"I can help you choose the shortest safe path. The most useful next details are where your files live now, whether PlayCanvas needs to stay updated, and whether you already have a finished folder to upload to VIVERSE. You can reply like this: `Files are in: /absolute/path PlayCanvas sync needed: yes/no Ready to publish to VIVERSE: yes/no`. If you are not sure whether your folder is for editing, PlayCanvas sync, or final upload, I can help you classify it first."

Tasks:

- determine whether the project should use an Editor-first, local-first, or hybrid workflow
- identify which folder is source, which folder is PlayCanvas asset root, and which folder is deployable build output
- recommend when to use playcanvas-sync and when to use the repo helper `pnpm setup:playcanvas-sync -- ...`
- recommend when to use the Toolkit extension upload flow versus `@viverse/cli`, and when to use the repo helper `pnpm publish:viverse -- ...`
- provide the smallest complete next-step plan for the user's current state
- when the flow reaches a successful VIVERSE upload, end with direct links to [VIVERSE Studio](https://studio.viverse.com/) and [How to Publish](https://docs.viverse.com/how-to-publish), and make clear that upload is not the final public release step

When the user needs active local-to-PlayCanvas synchronization, prefer an automatic-sync setup and route to `pnpm setup:playcanvas-sync -- --require-watch ...` when the PlayCanvas inputs are already known.

For day-to-day sync commands, prefer the generated local sync shortcuts first. Only show raw commands when the shortcuts are missing or broken.

Prefer a concrete workflow with decision points instead of a generic overview.

When the user appears non-technical:

- do not start with terms like source folder, asset root, build output, CLI, or branch unless needed
- first identify their goal in plain language: keep editing, sync to PlayCanvas, or publish to VIVERSE
- prefer a short next-step plan over a taxonomy of options
- if PlayCanvas sync is needed, prefer guiding them to the helper and then the generated local sync shortcuts
- if details are missing, ask for them in one short plain-language request instead of a multi-part technical checklist
- if details are missing or ambiguous, include one short English fill-in example the user can copy instead of stopping at a generic request

When the required inputs are already known, prefer routing to the repo helpers instead of restating the full manual flow.

Use the PlayCanvas sync helper when all of these are known:

- PlayCanvas project ID
- PlayCanvas branch ID
- local target directory
- PlayCanvas API key

Helper form:

```bash
pnpm setup:playcanvas-sync -- \
	--project-id <project-id> \
	--branch-id <branch-id> \
	--target-dir <absolute-target-dir> \
	--api-key <api-key> \
	--require-watch
```

Then continue with:

```bash
<absolute-target-dir>/.pcsync/pull.sh
<absolute-target-dir>/.pcsync/watch.sh
```

Explain the generated automatic-sync shortcut as the simple local shortcut that starts automatic sync with `--force` by default so normal drift does not block startup. Only show raw `pcsync` command forms if the shortcuts are missing or broken.

When the installed CLI supports `pushAll`, explain that the generated automatic-sync shortcut may also do a best-effort catch-up push before automatic sync starts, so local edits that already existed before startup are less likely to be missed.

Use the VIVERSE publish helper when all of these are known:

- deployable build output directory
- existing app ID or auto-create decision

Helper forms:

```bash
pnpm publish:viverse -- \
	--path <build-output-dir> \
	--app-id <app-id>
```

or:

```bash
pnpm publish:viverse -- \
	--path <build-output-dir> \
	--auto-create-app \
	--name <app-name>
```

If the user is missing one side of the workflow, only route them to the helper for the side that is already fully specified.

When information is missing or ambiguous, the reply should still contain concrete guidance, not just a request. Prefer one short English fill-in template the user can copy, plus one short sentence about how to decide whether the next step is sync, publish, or both.

When the chosen path includes a successful VIVERSE upload, do not stop at "continue in Studio". End with a short plain-language follow-up that:

- says the upload is complete but not fully published yet
- links directly to [VIVERSE Studio](https://studio.viverse.com/)
- links to [How to Publish](https://docs.viverse.com/how-to-publish) as the official fallback guide
- tells the user to open their world, check the uploaded version, preview it, and submit it for review
