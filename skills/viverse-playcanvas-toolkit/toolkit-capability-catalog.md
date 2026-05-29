# Toolkit Capability Catalog

This document is an internal routing reference for maintainers and agent behavior.

End-user replies should use plain language and should not mention internal scaffold names or internal catalog field names by default.

Use this document as the human-readable source of truth when translating a user's scene or feature request into an existing VIVERSE PlayCanvas Toolkit composition.

For machine-readable routing data, use [toolkit-capability-catalog.json](./toolkit-capability-catalog.json).

## Why This Exists

The goal is to help AI assemble complete results from prebuilt toolkit capabilities instead of defaulting to new custom code.

The preferred order is:

1. decompose the user's requested behavior into slices
2. reuse an existing runtime-ready capability when one matches a slice
3. reuse an existing generator-ready recipe when the request is really template-like
4. combine existing toolkit systems and helpers with minimal glue
5. only introduce one narrow missing capability when composition is otherwise impossible

## Behavior-First Composition

Do not treat this catalog as a list of past scene names to search for.

Use it as a routing source after first decomposing the request into:

- player action
- world response
- state change
- completion or success condition

Then match those slices to Toolkit systems, generator templates, and reference capabilities.

If no single capability covers the whole request, compose multiple slices instead of searching for one old example that looks similar.

## Output Routes

Choose one route before proposing implementation.

### 1. Runtime Integration Route

Use this when the feature should live in a user-owned `scripts/index.mjs` flow and run as world behavior.

Best for:

- interactable scene logic
- multi-step trigger and action chains
- quest-driven world behaviors
- features that own entities, triggers, and cleanup logic

Current note:

- there is no remaining dedicated runtime interaction scaffold in the repo; interaction scenes should be composed from existing Toolkit systems and reference capabilities

### 2. Generated Scene Content Route

Use this when the result should be emitted from a recipe and written as generated scripts plus manifests.

Best for:

- repeatable content sections
- lightweight content packs
- content that fits a stable template better than an open-ended runtime module

Current generator-ready surface:

- recipe generation for the current exported template path
- currently supported template: `proximity-hint`

### 3. Workflow Helper Route

Use this when the user's real need is not a scene feature but a workflow step.

Best for:

- PlayCanvas sync setup
- build/package decisions
- VIVERSE world publish flows

Existing helper prompts and skills live under [prompts](./prompts) and [skills](./skills).

Workflow disambiguation notes:

- world publish is for deploying or updating the world itself and should include stable app identity plus build-output verification

Current helper skill targets:

- world publish: [skills/viverse-cli-publish/SKILL.md](./skills/viverse-cli-publish/SKILL.md)

## Capability Levels

### Runtime-Ready Capabilities

These are already shaped for the final `scripts/index.mjs` path.

- There is currently no dedicated runtime-ready interaction scaffold kept in the repo.
- For interaction-heavy scenes, compose from Toolkit systems plus reference capabilities instead of copying a scaffold.

### Generator-Ready Capabilities

These already have a generation pipeline.

- Proximity hint recipe template
  - source: current exported template path for `proximity-hint`
  - strengths: repeatable hint content, generated script output, manifest generation, bootstrap option
  - use when: the user wants guided text or hint content attached to a place in the world

### Reference Capabilities That Still Need Productization

These are useful capability sources, but they currently live as repo examples or preview utilities rather than runtime-ready `scripts/index.mjs` modules.

- Pickable object interactions
  - source: [apps/preview/src/utils/pick-and-action.ts](./apps/preview/src/utils/pick-and-action.ts)
  - useful for: grabbing, holding, interaction props
  - current integration recommendation: thin integration layer
  - why: the core pickable interaction already exists, but the current file still hardcodes demo assets, per-model grip examples, and optional debug grip visualization
- Seating interactions
  - source: [apps/preview/src/utils/seat-scene.ts](./apps/preview/src/utils/seat-scene.ts)
  - useful for: sit spots, moving seats, exit positions
  - current integration recommendation: thin integration layer
  - why: the core seating capability already exists, but the current file still mixes visualization helpers, coaster motion, and multiple sample seat layouts into one scene entry point
- Media playback zones
  - source: [apps/preview/src/utils/media-scene.ts](./apps/preview/src/utils/media-scene.ts)
  - useful for: flat video, spherical video, positional audio, media controls
  - current integration recommendation: thin integration layer
  - why: the core media capability already exists, but the current file is still demo-shaped because it hardcodes sample assets, placement, and multiple example entities in one scene helper
- Link buttons and billboards
  - source: [apps/preview/src/utils/link-and-billboard-scene.ts](./apps/preview/src/utils/link-and-billboard-scene.ts)
  - useful for: world-facing UI, external links, camera-facing signage
  - current integration recommendation: thin integration layer
  - why: the core billboard and link capabilities already exist, but the current file still mixes demo-specific rotating targets, hardcoded links, and sample button layout in one preview helper
- Post effects and visual polish
  - source: [apps/preview/src/utils/post-effects.ts](./apps/preview/src/utils/post-effects.ts)
  - useful for: scene look and presentation tuning

These should not be treated as production-ready runtime modules until they are promoted into the `scripts/index.mjs` output path.

## Toolkit System Capabilities

These package-level systems are broader than one scene feature, but they are still valid composition inputs.

- Core runtime utilities in [packages/core](./packages/core)
  - app orchestration, module and system composition, asset loading, local-player lookup, shared condition checks
  - when the request sounds like bootstrap the Toolkit app, extend a Toolkit-managed system, load this asset, or get the current Toolkit-managed player, prefer the named core utilities before bespoke bootstrap or fetch glue
- Config runtime utilities in [packages/config](./packages/config)
  - environment-aware runtime configuration and asset-domain resolution
  - when the request is about Toolkit runtime settings, app-level config, or environment-specific behavior, prefer the config surface instead of hardcoded constants
- Local player systems in [packages/local-player](./packages/local-player)
  - locomotion, cameras, XR, interaction, avatar setup
  - treat camera mode, locomotion, avatar module, interaction module, and XR module requests as named local-player subfamilies, not only as one broad LocalPlayerSystem route
  - when the request is avatar- or physics-heavy, add a preflight for collider strategy, ownership, and safe cleanup before promising implementation shape
- Quest systems in [packages/quest](./packages/quest)
  - objective tracking and completion flow
  - when the request is about quest structure or objective units, also consider the quest model family such as Quest and Task, not only QuestSystem startup
- UI systems in [packages/ui](./packages/ui)
  - quest UI, chat UI, world-facing controls
- Network systems in [packages/network](./packages/network)
  - multiplayer and synchronized state
  - when the request is limited to default-room shared presence or default-room synchronized interactions, prefer the dedicated skill [skills/viverse-default-room-multiplayer/SKILL.md](./skills/viverse-default-room-multiplayer/SKILL.md) before treating it as open-ended multiplayer architecture
  - when adding multiplayer into an already working world, treat the current local path as a preservation baseline rather than disposable scaffolding
  - do not rewrite a working world just to add default-room multiplayer; prefer one small insertion point over a new unified architecture
  - gate app identity, auth, and other multiplayer prerequisites before enabling the new path
  - do not claim completion until one preserved local behavior and one new multiplayer behavior both work
- Extension actions and triggers in [packages/extension](./packages/extension)
  - reusable interaction primitives such as selection, trigger enter/leave, toast, toggle, event firing, audio zones, and video texture controls
  - treat trigger-and-action routing as a family: zone enter, teleport, spawn point, toast, toggle, and media-control requests should prefer named Toolkit actions, triggers, or media helpers before custom event plumbing

## Interaction Cue Map

Use this as a fast intent-to-capability reminder before inventing bespoke scene logic.

- If the request sounds like a zone trigger, player-only activation, or another authored world reaction:
  - check Extension trigger or action primitives first
  - inspect config shape before writing manual polling, distance checks, or custom filter helpers
- If the request sounds like teleport the player, set a spawn point, or move the player to another area through authored world logic:
  - check Extension action primitives first
  - prefer named teleport or spawn-point actions before bespoke movement scripts
- If the request sounds like click this object, pick up this item, hold this prop, or activate something by direct interaction:
  - check pick, selection, and interaction primitives before writing custom pointer or raycast glue
- If the request sounds like use a third-person camera, first-person camera, XR mode, or avatar module:
  - check the local-player module family before writing a new controller stack from scratch
- If the request sounds like load a model, load an asset by URL, or bootstrap a Toolkit app shell:
  - check the core runtime utility family before writing custom asset loaders or ad hoc app bootstrap code
- If the request sounds like complete a task after an interaction, unlock the next step, or mark an objective done:
  - check Quest systems, quest model types, plus Extension actions before writing ad hoc state flags
- If the request sounds like show or hide a panel, quest UI, toast, or world-facing control after an event:
  - check UI systems plus Extension event or toggle actions before wiring custom DOM state from scratch
- If the request sounds like the world should respond to a trigger and then do something else:
  - decompose it into trigger, action, state change, and completion result instead of collapsing it into one hand-written update loop

When one of these cues matches, the default question is not "how do I detect the player manually?".

The default question is "which existing Toolkit trigger, action, quest, or UI primitive already covers this slice?".

## Composition Rules

When composing a user request:

1. Start by classifying the request into guidance, interaction, media, traversal, UI, quest, multiplayer, polish, or workflow.
2. Decompose the request into player action, world response, state change, and success condition.
3. Choose the output route before choosing files.
4. Prefer runtime-ready and generator-ready capabilities over preview-only reference code.
5. If only reference capabilities exist, propose promoting one reference capability into a runtime module instead of inventing a brand-new implementation style.
6. If no existing capability fits exactly, identify the smallest missing capability rather than replacing the whole composition with bespoke code.
7. Keep the final result aligned with the current output path: `scripts/index.mjs`, generated recipe output, or workflow helper.
8. Do not reintroduce preview-only validation flows as product behavior.
9. Distinguish world publish from other workflow needs before giving workflow advice.

## Routing Guards For Newly Absorbed Knowledge

Use these guards during composition even if the user describes the request informally.

- If the user asks for avatar movement, traversal, colliders, or physics-heavy scene logic, do a short preflight for controllable avatar needs, environment colliders, follow-camera expectations, and safe physics cleanup.
- If the user asks to deploy the world, require app identity and built-output verification in the plan.
- If the user asks for simple multiplayer that can stay inside one default room, route to [skills/viverse-default-room-multiplayer/SKILL.md](./skills/viverse-default-room-multiplayer/SKILL.md) instead of implying named rooms, matchmaking, or generic multiplayer support.
- If the user asks for simple multiplayer in an already working world, preserve the existing local behavior path until the new multiplayer path is proven ready.

## Integration Policy For Existing Capability Sources

When a useful capability already exists in the repo, use this order before creating a new formal runtime version.

### 1. Direct Reference

Use direct reference when the existing capability already has a stable shape that fits the target output path.

Choose this when:

- the capability can be used without changing the source file
- the initialization model already fits the final route
- the file does not depend on preview-only assumptions

### 2. Thin Integration Layer

Use a thin integration layer when the existing capability is useful but needs a small adapter to fit the final route.

Choose this when:

- the core behavior is already correct
- only the output shape, dispatch point, or configuration surface needs adjustment
- the original source file should remain unchanged

This is the preferred path when the repo contains a good reference capability that should stay read-only.

### 3. New Formal Runtime Version

Create a new formal runtime version only when direct reference and a thin integration layer are both insufficient.

Choose this when:

- the source file is tightly coupled to preview-only structure or assumptions
- the capability needs lifecycle, configuration, or ownership rules that cannot be added cleanly from outside
- the final output must be stable for `scripts/index.mjs`, but the source file is only suitable as a reference implementation

If a new formal runtime version is needed, treat the existing file as the capability source and keep the original file unchanged unless the task explicitly allows modifying it.

## Expected AI Output

When AI uses this catalog well, its answer should usually contain:

- a plain-language best path
- a plain-language reason that fits the user's goal
- a plain-language description of the relevant toolkit support
- the minimum glue needed internally
- any one narrow missing capability that still needs to be created
- the final artifact shape the user will receive

## Structured Catalog Notes

The JSON companion catalog is intended for stable routing and matching.

Each capability entry should keep these fields consistent:

- `id`
- `displayName`
- `category`
- `sourcePath`
- `sourceKind`
- `outputRoute`
- `runtimeReadiness`
- `integrationRecommendation`
- `canModifySource`
- `useWhen`
- `strengths`
- `why`

Optional fields for richer routing:

- `internalOnly`
- `experimental`
- `userFacing`
- `sourceConstraints`
- `preferredFormalization`

Field intent:

- `internalOnly`: use this capability for internal routing only; do not surface its name in default user-facing replies
- `experimental`: avoid treating this as the default suggestion for non-technical users unless they explicitly ask for it
- `userFacing`: whether this capability can be named directly in a default end-user answer
