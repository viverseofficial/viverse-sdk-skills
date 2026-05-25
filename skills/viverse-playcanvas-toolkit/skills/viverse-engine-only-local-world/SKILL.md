---
name: viverse-engine-only-local-world
description: "Help a user create a VIVERSE world directly in a local folder using the PlayCanvas Engine and the VIVERSE PlayCanvas Toolkit, without going through the PlayCanvas Editor, and publish that folder to VIVERSE."
argument-hint: "Describe the empty (or near-empty) local folder you want to build in and what you want the scene to do"
---

# VIVERSE Engine-Only Local World

## What This Skill Does

This skill builds a runnable VIVERSE world directly inside a local folder, using the PlayCanvas Engine in code, **without** using the PlayCanvas Editor.

Treat the user as the end user of this workflow by default. Do not reinterpret a direct invocation as a request to maintain `prompts`, `skills`, or memory notes unless the user explicitly asks for customization maintenance.

Use this skill when the user wants to:

- start from an empty or near-empty local folder
- describe a scene in plain language and have the world generated for them
- avoid every step that requires opening the PlayCanvas Editor
- still rely on the PlayCanvas Engine and the VIVERSE PlayCanvas Toolkit API
- publish the resulting folder to VIVERSE directly

## Boundary

This skill **does** cover:

- Generating a minimal, runnable PlayCanvas Engine world in the simplest safe local project shape, using a local build step only when real Toolkit package imports are required
- Adding simple primitives (box, plane, sphere), one camera, basic lighting, a sky color
- Wiring in VIVERSE Toolkit features the user explicitly asks for (for example a leaderboard or default-room multiplayer) by delegating to the matching skill
- Running a local HTTP preview so the world is tested under conditions close to the VIVERSE runtime
- Publishing the folder via `pnpm publish:viverse`

This workflow is grounded by these repo-local helpers:

- [scripts/create-engine-only-world.mjs](../../../scripts/create-engine-only-world.mjs)
- [scripts/run-engine-only-world-smoke.mjs](../../../scripts/run-engine-only-world-smoke.mjs)
- [scripts/validate-engine-only-world.mjs](../../../scripts/validate-engine-only-world.mjs)
- [scripts/templates/engine-only-world/index.html.template](../../../scripts/templates/engine-only-world/index.html.template)
- [scripts/templates/engine-only-world/main.js.template](../../../scripts/templates/engine-only-world/main.js.template)

This skill **does not** cover:

- Generating complex art assets (meshes, textures, rigged characters)
- Designing gameplay systems beyond what the user describes
- Replacing the PlayCanvas Engine with another renderer
- Anything the existing Toolkit skills already say is out of scope

When the user's request needs assets that cannot be made from primitives or simple loaded `.glb` files, stop and tell the user which assets they need to provide.

## Language Rules

- Treat users as non-technical by default.
- Prefer "your folder", "your scene", "your world" over "asset root", "bootstrap", or "main world script".
- Do not ask the user to pick an engine version, a bundler, a build tool, or a module system. Choose safe defaults silently.
- Do not ask the user to read PlayCanvas Engine documentation.
- If the user volunteers a specific technical preference (engine version, bundler, file layout, TypeScript, etc.), respect it and override the default.
- Only ask the user about decisions that are about **content or business**, not tooling.
- Do not ask the user to compare implementation routes such as "simple vs complete", "lighter setup vs fuller setup", or "with vs without install". Those are implementation decisions owned by the agent.
- Treat Toolkit usage as the default. Do not ask the user whether the scene "should use Toolkit" unless they explicitly ask to avoid it.
- The preview URL is not a technical choice for the user to make. The agent should start preview, then tell the user exactly which local URL to open.
- The publish folder is not a decision for the user in normal flows. The agent should determine it and only mention it when the user needs to run the publish step manually.
- Do not inspect or edit prompt files, skill files, or memory notes just because one is open in the editor. The default job of this skill is to scaffold a world and publish it.

## What To Decide Silently (Do Not Ask The User)

Choose these defaults yourself. Do not present them as questions. The user does not need to understand or compare these implementation details.

| Decision                          | Default                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| How to load the PlayCanvas Engine | Prefer local package imports in the main world script when Toolkit packages are involved; use a CDN `<script>` only for the tiniest no-build local worlds                      |
| Engine version                    | Keep the PlayCanvas version compatible with the Toolkit packages being integrated; pin it in `package.json` or the starter HTML as appropriate                                 |
| Module system                     | JavaScript ES modules; use a minimal local build step when the runtime imports Toolkit or `playcanvas` packages directly                                                       |
| File layout                       | Start with `index.html` plus one main world script; add `package.json` and a finished output folder when the project consumes local/npm Toolkit packages                       |
| Build step                        | Skip the build step for the tiniest local world; use a local build tool such as Vite when bare module imports or Toolkit packages are required                                 |
| Default scene                     | One perspective camera, one directional light, one ambient color, one ground plane, a sky clear color                                                                          |
| Local preview server              | Use the project's existing preview command when the project already has a local dev flow; otherwise use `python3 -m http.server` (or any static HTTP server already available) |
| VIVERSE SDK / Toolkit features    | Only include what the user actually asks for; do not pre-wire leaderboard, multiplayer, or auth by default                                                                     |

Do not add particles, post-processing, background music, advanced shaders, or HUD elements unless the user asks for them.

## What To Ask The User (Content And Business Decisions Only)

Ask only when the answer cannot be inferred safely:

1. **The folder path** to build in (must be absolute).
2. **What the scene should contain or do**, in the user's own words.
3. **Whether they already have a VIVERSE app** or want a new one auto-created (only when reaching the publish step).
4. **Leaderboard Meta Name**, only if the user wants a leaderboard (delegate to the leaderboard skill for the rest).
5. **External assets** (such as a specific `.glb` model) — where the file is and what entity should use it.

When details are missing, prefer one short plain-language question plus one English fill-in template, for example:

`Folder: /absolute/path I want my scene to: (describe in your own words) Existing VIVERSE app: yes/no`

Do not ask the user about Node.js versions, npm, pnpm, installation steps, bundlers, or PlayCanvas Engine versions in normal flows unless the user explicitly asks to change the tooling route.

## Standard Procedure

1. **Confirm the folder.** If it is missing or vague, ask once. If it already contains files, treat anything unrelated to the world as untouchable unless the user says otherwise.
   Once the target folder is known, keep implementation work scoped to that folder plus the current Toolkit skill workspace evidence and helpers needed for the workflow. The allowed exception is this workspace's own `skills/`, `prompts/`, `docs/`, `scripts/`, `packages/`, catalog, contract, checklist, and review files. Do not browse sibling local folders looking for a similar project, archived copy, or ready-made scene unless the user explicitly tells you to use that folder as a reference.
2. **Translate the user's description into a small entity plan** (camera, lights, ground, and the specific objects they described). Keep the plan minimal.
3. **Choose the base world shape silently.** Use [scripts/create-engine-only-world.mjs](../../../scripts/create-engine-only-world.mjs) when the target folder is empty or near-empty and a plain starter is enough. If the user needs real Toolkit package imports in an empty or near-empty folder, scaffold that folder as a local project with a build step instead of forcing a CDN-only starter. If the folder already contains a working world, keep that world as the baseline and extend its current runtime entry in place; do not rebuild or replace it just to switch implementation style.
4. **Generate `main.js`** that:
   - creates a `pc.Application` on a full-window canvas
   - registers the default scene (camera, light, ground, sky color)
   - adds the entities the user described as PlayCanvas primitives or `.glb` loads
   - calls `app.start()` at the end
5. **Run [scripts/validate-engine-only-world.mjs](../../../scripts/validate-engine-only-world.mjs)** against the folder before previewing or publishing.
6. **Start local preview the way this folder expects.** If the project has a `package.json`, read its `scripts` first and inspect `dependencies` plus `devDependencies` before running anything, so the preview command matches the project's real toolchain. Run that command explicitly in the target project directory, or use an equivalent `--prefix` or absolute-path form; do not trust the terminal's inherited working directory when multiple repos or folders have been visited. In practice, prefer command forms such as `cd /absolute/project && npm run dev` or `npm --prefix /absolute/project run dev` over a bare `npm run dev`. Treat a dev server as a long-running process, not a one-shot command. Once the terminal prints the local preview URL or another ready signal, treat startup as successful and move on to page/runtime checks instead of re-running the same command. If the output clearly belongs to another project, stop and restart from the target project directory with an explicit target-path command. Do not ask the user how to preview it. Start the correct local preview command yourself, then tell the user the exact URL to open. Do not instruct the user to double-click `index.html`; opening via `file://` will break asset fetches.
7. **Confirm the world loads** in the browser before adding more features. A started dev command is not enough; use the real URL reported by the dev server and keep going until the first runtime error is visible if the scene does not render.
8. **Layer in Toolkit features the user asked for**, one at a time, by handing off to the matching skill:
   - leaderboard: [viverse-leaderboard](../viverse-leaderboard/SKILL.md)
   - default-room multiplayer: [viverse-default-room-multiplayer](../viverse-default-room-multiplayer/SKILL.md)
9. **Publish** by handing off to [viverse-cli-publish](../viverse-cli-publish/SKILL.md). Determine the correct publishable folder yourself. Only mention that folder path to the user when they need to run or verify the publish step.

When the user wants one command that scaffolds, validates, and previews the publish dry run shape, prefer [scripts/run-engine-only-world-smoke.mjs](../../../scripts/run-engine-only-world-smoke.mjs) before giving longer manual step lists.

## Why `file://` Is Not Allowed For Preview

Opening `index.html` directly from the file system uses the `file://` scheme. Under `file://`, browsers block most `fetch` calls and many WebGL texture loads. The VIVERSE runtime serves the world over HTTPS in an iframe, which behaves like a real HTTP server, not like `file://`.

This means a world that "works when I double-click index.html" can still fail after upload. The skill must always verify the world under a local HTTP server before declaring success.

Acceptable local preview commands depend on the project shape, but the agent should choose one and then tell the user the exact local URL to open:

```bash
# simple local folder
python3 -m http.server 8080
# or
npx --yes serve -l 8080 .

# local project with a build step
cd /absolute/project && npm run dev
# or
npm --prefix /absolute/project run dev
```

Tell the user the local URL reported by that command and ask them only to open it and confirm the world renders.

## Common Preview Ready Signals

Treat these as startup success signals for long-running local preview processes. Once one appears, do not re-run the same preview command just because the terminal stays open.

- Vite: output such as `Local: http://localhost:5173/`
- Next.js: output such as `Local: http://localhost:3000` or `Ready in ...`
- `serve`: output such as `Accepting connections at http://localhost:3000`
- Python HTTP server: output such as `Serving HTTP on 0.0.0.0 port 8080` or `Serving HTTP on :: port 8080`

After a ready signal appears, the next step is page or runtime validation at that URL, not another preview restart.

## Folder Shape (Final State)

After this skill runs, the folder should look approximately like one of these shapes:

```
# simple local folder
your-folder/
├── index.html
├── main.js
└── assets/        (only if the user provided external assets)

# local project with a build step
your-folder/
├── index.html
├── main.js
├── package.json
├── public/        (optional)
└── dist/          (finished folder for upload)
```

For the simple local folder, the editing folder is also the final upload folder. For projects with a build step, `dist/` or the equivalent finished output folder is the publishable folder.

Disqualifiers that mean the folder is **not** ready to publish:

- `index.html` is missing
- `main.js` (or whatever entry the script tag references) is missing
- the folder requires a build step but no finished output folder has been produced yet
- the world has only been opened via `file://`, never via HTTP
- the user has not confirmed the world actually renders

Do not require `manifest.json`. That file is a PlayCanvas Editor export artifact and is not produced by this skill.

## Toolkit API Usage Rules

When the user asks for a Toolkit-supported feature, do **not** reinvent it in plain VIVERSE SDK code. Prefer the existing Toolkit packages:

- multiplayer: `packages/network`
- leaderboard: the runtime boundary scaffolded by [scripts/create-leaderboard-runtime-boundary.mjs](../../../scripts/create-leaderboard-runtime-boundary.mjs)
- other Toolkit packages listed in [README.md](../../README.md)

Engine-only integration of these packages still requires:

- importing or attaching the package's PlayCanvas system or script class to the running `pc.Application`
- doing this **before** `app.start()` when the package documents that requirement

When the world uses `@viverse/local-player` or `LocalPlayerSystem`, treat Ammo loading order as mandatory runtime setup:

- configure and await Ammo before constructing `ViverseApp` or any `LocalPlayerSystem`-dependent runtime object
- when the scene uses collision, rigidbody, trigger zones, or collider-backed selection, initialize the PlayCanvas physics world before creating those entities; loading Ammo alone is not enough if the app has not finished physics-library setup
- when the scene adds a service-backed runtime such as multiplayer or another app-identity-dependent path, validate that the actual runtime object receives the required identity or config; env-file presence or build success alone is not enough
- if preview shows a blank screen or a startup failure after build passes, inspect the terminal output and browser-visible runtime error immediately instead of treating the preview step as complete
- do not claim the preview succeeded until the runtime scene is actually reachable in the browser

When the scene includes quest progress or a quest objective:

- default to the Toolkit quest UI already provided by the project or scaffold
- in a bare engine-only Vite world, verify whether the Toolkit UI stylesheet must be imported explicitly so quest panels render with their intended background and visual treatment
- do not add a second quest HUD, duplicate task panel, or replacement quest tracker unless the user explicitly asks for custom quest presentation
- if you add a custom interaction prompt HUD, keep it separate from quest progress so the scene does not show two quest panels at once

When the scene includes trigger-based proximity or click-selection interaction:

- confirm that the intended trigger zone is built as a real trigger body, not just as a generic collision-plus-rigidbody pair
- treat collider creation timing as part of the feature: trigger zones, doors, consoles, and player colliders should be created only after physics initialization is ready for the app
- when click or selection input targets one entity inside another collision volume, rule out the outer collider and the player's own collider as raycast blockers before concluding that the selection trigger itself is broken

If a Toolkit package's documented integration point assumes a PlayCanvas Editor-attached script, translate that into the engine-only equivalent: create an entity, add a `script` component, and instantiate the script class against that entity in code. Do not ask the user to do this.

## Common Mistakes To Catch

- offering the user a choice of engine version, bundler, or module system instead of choosing
- forcing a CDN-only no-build starter when the requested Toolkit integration needs real package imports
- generating a complex scene the user did not ask for
- skipping the local HTTP preview step
- publishing a folder before the world has been confirmed to render in a browser
- treating the absence of `manifest.json` as proof that the folder is not publishable
- duplicating Toolkit functionality with hand-written VIVERSE SDK calls when a Toolkit package already covers it

## Output Expectations

When using this skill, produce in order:

1. A short plain-language summary of what will be generated
2. The files written, with their paths
3. The exact validation command
4. The exact local preview URL the user should open
5. The next action the user should take: open the URL and confirm the world renders
6. The exact local preview command only when the user needs it or when the agent could not start preview directly
7. Only after confirmation, the publish hand-off

If the user asks for a quick confidence check rather than a fully manual walkthrough, you may give the smoke command first and then the preview command.

## Routing

- Before scaffolding: [choose-viverse-workflow](../choose-viverse-workflow/SKILL.md) if the user is still deciding their workflow
- After the world renders locally: [viverse-cli-publish](../viverse-cli-publish/SKILL.md)
- For optional feature integrations: [viverse-leaderboard](../viverse-leaderboard/SKILL.md), [viverse-default-room-multiplayer](../viverse-default-room-multiplayer/SKILL.md)
- For folder classification doubts: [toolkit-build-and-package](../toolkit-build-and-package/SKILL.md)
- For failure analysis: [toolkit-publish-troubleshooting](../toolkit-publish-troubleshooting/SKILL.md)

## FAQ

### Does this skill require the PlayCanvas Editor?

No. This is the engine-only path. The PlayCanvas Engine and the VIVERSE Toolkit packages are still used, but no step opens the Editor.

### Does this skill require a build step?

Sometimes. The agent should decide that silently based on the requested Toolkit integration. The user does not need to choose the route; they only need the preview URL and, when necessary, the final publishable output folder.

### Should the user zip the folder before publishing?

No. The VIVERSE CLI accepts a folder path and handles packaging.

### What if the user does ask about engine versions or bundlers?

Respect the user's preference, override the defaults in this skill, and continue. Do not lecture the user about why the default would have been simpler.

### What if the user's scene description needs custom 3D models the skill cannot generate?

Stop and ask for the model file location. Do not invent geometry beyond primitives the engine ships with.
