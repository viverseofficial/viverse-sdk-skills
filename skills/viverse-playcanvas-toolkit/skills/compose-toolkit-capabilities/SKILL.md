---
name: compose-toolkit-capabilities
description: "Translate a user scene or feature request into a plan that reuses existing Toolkit support, chooses the right output path, and answers in plain language for non-technical users by default."
argument-hint: "Describe what you want to make or what help you need, plus any must-have details you already know such as your project folder or target world."
---

# Compose Toolkit Capabilities

## What This Skill Does

Use this skill when the user describes a scene, feature, or gameplay idea in natural language and the main job is to map that request onto existing toolkit capabilities.

The goal is not to invent a fresh implementation first.

The goal is to:

1. classify the request
2. choose the right output route
3. decompose the requested behavior into reusable slices
4. reuse existing capabilities
5. keep the result aligned with the current production flow

## Behavior-First Rule

Always start from what the player should do and what the world should do in response.

Decompose the request into:

- player action
- world response
- state change
- completion or success condition

Then match Toolkit support to those slices.

Do not start by searching for a prior scene name, old prototype name, or one-file example that looks superficially similar.

## Target Project Rule

When the user is asking for a feature in their own world, treat the destination as the user's local project folder.

For in-world scene behavior:

- first look for the user's main world script in their project folder
- default to `scripts/index.mjs` for PlayCanvas Editor-exported projects, or `index.html` plus the single JS entry it loads for engine-only local worlds
- if the project already contains a runnable world shape such as `package.json` plus `index.html` plus a local JS entry, treat that as the source of truth and modify it in place
- do not re-scaffold, regenerate, or replace an existing runnable local world unless the user explicitly asks to rebuild it from scratch
- if the project folder is not available in the current workspace or prior context, ask for the local project folder before implementing
- once the target project folder is known, keep implementation search and edits scoped to that folder, the target project's installed dependencies, and the current Toolkit skill workspace files needed as API or workflow evidence
- treat this Toolkit skill workspace as an explicit allowed exception source: files under this workspace's `skills/`, `prompts/`, `docs/`, `scripts/`, `packages/`, catalog, contract, checklist, and review docs may be consulted or executed when they are the grounded helper surface for the requested workflow
- do not inspect sibling user project folders, archived copies, backups, or similarly named local folders as implementation candidates unless the user explicitly names them as references
- do not import, copy, or adapt code from another user folder just because it appears to solve a similar request; treat other local folders as out of scope unless the user explicitly authorizes them as a source
- the Toolkit skill workspace exception does not authorize inspecting other sibling user project folders outside this workspace, or copying code from arbitrary local folders
- do not ask the user to choose the output route, main world file pattern, or integration style when the project evidence already makes the safe choice clear
- infer the main world script from the target project only when its own files identify it unambiguously instead of asking the user to name files
- do not fall back to editing Toolkit authoring files in this repo just because they are available
- only edit files such as apps/editor-extension/src/assets/custom-script-index.js when the user explicitly asks to change Toolkit internals

When the local project folder is missing, ask one short practical question in the user's language.

Preferred question shape:

- ask for the local project folder path directly
- say you will locate the main world script in that project
- do not ask broad follow-up design questions before the target folder is known

Preferred wording example:

- "Please share your local project folder path. I will find the main world script there and implement the scene feature in that project."

## Source Of Truth

Use [toolkit-capability-catalog.md](../../toolkit-capability-catalog.md) as the human-readable catalog of reusable capabilities and output routes.

Use [toolkit-capability-catalog.json](../../toolkit-capability-catalog.json) as the primary machine-readable routing catalog.

Use [toolkit-api-discovery-index.json](../../../toolkit-api-discovery-index.json) as the API-level lookup table for concrete Toolkit systems, triggers, actions, and interaction primitives.

When an indexed API entry includes config field hints, construction hints, or capability hints, use those hints before inventing custom filters, helper state, wrapper config names, or replacement control surfaces.

Use internal catalog names, file paths, and field names silently. In user-facing replies, prefer plain language and do not mention internal scaffold names, source file paths, `runtimeReadiness`, `integrationRecommendation`, or `scripts/index.mjs` unless the user explicitly asks for implementation details.

Do not anchor on the currently open editor file or the most recently discussed internal example unless the user explicitly asks about it.

For interaction-heavy requests, consult the catalog's interaction cue map before inventing low-level control logic.

When a request can plausibly map to an existing Toolkit API, consult the API discovery index before writing bespoke scene logic.

When the proposed solution depends on a specific Toolkit config field, method argument, or property name, verify the exact name from the package type or source declaration before claiming it exists or falling back to bespoke code.

When the user asks to add a new capability into an already working world, treat the current working behavior as a preservation baseline, not as disposable scaffolding.

Do not rewrite the existing app bootstrap, player setup, quest flow, interaction flow, or UI wiring just because a new feature touches those surfaces.

Use the smallest additive integration point that can host the new capability.

If a request such as multiplayer, networking, quest expansion, or interaction ownership appears to touch multiple systems, do not respond by restructuring the whole world first.

Instead:

- identify the narrowest insertion point in the existing world
- name the existing behaviors that must continue to work after the change
- preserve the existing single-player or offline path unless the user explicitly asks to replace it
- treat broad rewrites as out of bounds unless the user explicitly asks for refactoring or a rebuild

Compact review and execution rules:

- Do not treat a new feature as permission to rewrite a working world.
- Use one small insertion point instead of a new unified architecture.
- Keep the current single-player or offline path working unless replacement is explicitly requested.
- Gate new prerequisites before enabling the new path.
- Do not let a missing multiplayer or auth prerequisite break an existing local path.
- Name at least one existing behavior that must still work after the edit.
- Verify at least one preserved behavior from each directly affected slice in addition to the new feature.
- If the blast radius grows across bootstrap, physics, UI, and interaction at once, stop and narrow the change.

Match the user's behavior language against the API index intent cues first, especially for:

- player controllers, cameras, and avatar behavior
- trigger zones, player-only activation, and event chains
- direct interaction, pick up, sit, open link, or media controls
- quest progress, task completion, and UI reactions
- networking, account identity, and authenticated runtime behavior

If the user request sounds like a zone trigger, player-only activation, or another authored world reaction, first check Toolkit trigger or action primitives and inspect their config shape before inventing an update loop, a position poller, a distance check, or a custom filter helper. Prefer an existing trigger or action config field when one exists.

## Output Routes

Choose one route first.

### In-World Feature Route

Choose this when the feature should land in the user's own world code.

Use it for:

- interactable world features
- trigger and action chains
- entity-owned world logic
- quest-driven or stateful scene behaviors
- one-board leaderboard integration that lands in the user's world code

### Generated Scene Content Route

Choose this when the feature is better expressed as a stable generated template.

Use it for:

- repeatable content sections
- generated hint or marker content
- recipe-driven output with scripts plus manifests

### Workflow Helper Route

Choose this when the user's real need is a workflow step rather than a scene feature.

Use it for:

- PlayCanvas sync
- build/package choice
- world publish routing

Within workflow help, disambiguate before answering:

- if the user wants to publish or update the world itself, treat it as a world publish flow

Preferred handoff once the route is clear:

- world publish: [viverse-cli-publish](../viverse-cli-publish/SKILL.md)

## Composition Rules

Follow this order:

1. Decompose the requested behavior into slices.
2. Prefer an existing runtime-ready capability for each slice when one exists.
3. Otherwise prefer an existing generator-ready recipe when the request is really template-like.
4. Otherwise combine package-level toolkit systems and reference capabilities with minimal glue.
5. Only if all of those fail, identify one narrow missing capability that should be created.

Before saying that a Toolkit capability is unavailable or before falling back to bespoke scene code, verify the nearest real availability evidence you have:

- the current `toolkit-source-manifest.json`
- the vendored Toolkit artifacts in this repo when relevant
- the user's installed dependencies in their target project when that project already exists
- the API-level evidence in `toolkit-api-discovery-index.json` when the request is about a concrete runtime behavior

Do not widen implementation search into neighboring user folders just because the target folder is empty, incomplete, or missing a needed feature. If the target folder is empty, scaffold there. If it is incomplete, repair or extend that folder. If a needed asset path is outside the target folder, use only the specific user-provided asset path rather than searching nearby folders for alternatives.

When extending an existing working world, extend the current entrypoint and runtime wiring in place instead of replacing them with a fresh unified flow.

For multiplayer or networking additions in an existing world:

- preserve the existing local interaction path as the default baseline
- gate new runtime prerequisites such as app identity or authenticated state before enabling the new path
- do not let a missing multiplayer prerequisite disable or regress a previously working local scene path

Do not claim that `quest`, `extension`, `ui`, or other Toolkit capability slices are unavailable based only on an older scaffold shape or an older cached assumption.

Do not jump straight to writing custom code when the repo already contains a reusable route.

Consult the structured catalog first when choosing between capabilities with similar surface descriptions.

Use the catalog to match behavior slices, not to hunt for a past scene name.

When implementation is requested, write into the user's local project main world script rather than this Toolkit repo, unless the user explicitly requested Toolkit maintenance.

If implementation is requested but the local project folder is missing, the immediate next action should usually be asking for that folder path.

If the project folder is known, resolve the technical landing point yourself and ask the user only for missing product or business details that cannot be inferred safely.

If the task includes local preview, derive the preview route from the target project itself before starting a server:

- inspect the project's actual `package.json` scripts or equivalent local preview entry first
- use the host and port reported by the target project's own dev server instead of inventing one
- do not open repo template URLs, temporary template copies, or stale prior preview URLs when the target is the user's current project
- treat custom host or port overrides as exceptional and explain them when they are needed

If the request includes avatar movement, traversal, colliders, rigid bodies, or physics-heavy interaction, add a short implementation preflight before proposing file edits:

- identify whether the scene needs a controllable avatar, environment colliders, or both
- choose the collider strategy before writing behavior glue
- avoid lifecycle plans that create physics entities without a matching safe cleanup path
- treat follow-camera reset and ownership cleanup as part of the feature, not optional polish

If the implementation changes interaction behavior, physics, trigger routing, selection, quest progression, or UI state, do not treat a successful build as sufficient proof that the fix works.

Before claiming the feature is fixed, require at least one behavior-facing validation step such as:

- local preview with a concrete interaction check
- the repo smoke flow when it matches the target shape
- a narrow runtime check that exercises the edited interaction path

When the target world already worked before the edit, require at least one preserved-behavior check in addition to any new-feature check.

Examples of preserved-behavior checks include confirming that an existing quest panel still renders, an existing trigger still fires, an existing collider still blocks movement, or an existing click interaction still selects the intended target.

If the request includes publishing or deployment:

- for world publish, treat stable app identity and build-output verification as mandatory checkpoints

Do not treat preview-only examples as production-ready runtime surfaces unless the task explicitly includes promoting them.

Do not reintroduce preview validation flows as the final product path when a runtime `scripts/index.mjs` route already exists.

## Request Classification

Before proposing implementation, classify the request into one or more of these buckets:

- guidance or hinting
- interaction
- pickup or hand interaction
- seating or traversal
- avatar or physics
- media playback
- UI or links
- quest progression
- leaderboard or ranking
- multiplayer or networking
- visual polish
- world publish
- workflow

Then choose the route and the capabilities.

For interaction-heavy requests, explain the intended interaction flow first in plain language, then map that flow onto Toolkit support.

When a leaderboard or ranking request clearly stays within one app ID, one leaderboard Studio Meta Name, score submit, and bounded top-entries or self-rank readback, prefer handing off to [viverse-playcanvas-leaderboard](../viverse-playcanvas-leaderboard/SKILL.md) instead of treating it as open-ended backend design.

If that leaderboard request is otherwise in scope but the user does not yet know the app ID or leaderboard Studio Meta Name, keep the route pointed at [viverse-playcanvas-leaderboard](../viverse-playcanvas-leaderboard/SKILL.md) and let that workflow give the bounded prerequisite recovery steps; when app identity is the only blocker and no target world exists yet, let that workflow ask whether the user wants to create or publish the target world now through the preferred CLI publish path.

When a multiplayer or networking request clearly stays within default-room shared presence or default-room synchronized interactions, prefer handing off to [viverse-default-room-multiplayer](../viverse-default-room-multiplayer/SKILL.md) instead of treating it as open-ended multiplayer architecture.

If that multiplayer request is otherwise in scope but the app ID is still missing, keep the route pointed at [viverse-default-room-multiplayer](../viverse-default-room-multiplayer/SKILL.md) and let that workflow either give the bounded app-ID recovery steps or, when app identity is the only blocker and no target world exists yet, ask whether the user wants to create or publish the target world now through the preferred CLI publish path.

When the structured catalog already contains a matching capability, prefer its recorded `outputRoute`, `runtimeReadiness`, and `integrationRecommendation` over ad hoc reinterpretation.

When `canModifySource` is `false`, treat the source file as read-only unless the task explicitly allows modifying it.

If a capability is internal or experimental, keep that name out of the user-facing answer by default and describe the capability in plain language instead.

## Expected Output Shape

When using this skill, return:

1. the best path in plain language
2. why that path fits the request
3. what kind of existing toolkit support fits
4. the final result shape in plain language
5. the minimum glue needed internally
6. one narrow missing capability if composition is still incomplete
7. the immediate next action

For non-technical users, prefer wording such as:

- in-world interaction
- generated content
- setup help
- publish help

Avoid leading with wording such as:

- in-world feature route
- generated scene content route
- workflow helper route
- direct-reference
- thin-integration-layer

## Preferred Reply Templates For Newly Absorbed Routes

When the request clearly matches one of these route types, prefer a short answer shape like these before adding implementation detail.

### World Publish Template

- best path: "This is mainly a world publishing task. I will verify the finished folder and publish target before deployment."
- why it fits: mention deploy world, republish, update live world, or final world release requests
- toolkit support shape: mention finished folder, world/app target, and publish verification in plain language
- immediate next action: ask for the finished folder path only if it cannot be inferred, and ask whether the world/app already exists only if that target is still unknown

## Good Outcomes

Good outcomes look like this:

- "Use the in-world behavior path. Reuse an existing interaction pattern, quest progress support, and selection-based interaction, then add one narrow seating adapter only if the user also needs sitting behavior."
- "Use the generated scene content route. The request is really a repeatable hint or signage pack, so reuse the proximity-hint template instead of inventing a custom runtime feature."
- "Use the workflow helper route. The user is really asking how to sync or publish, not how to build a new scene feature."

## Bad Outcomes

Avoid outcomes like this:

- proposing preview-only utilities as the final shipped path without promotion
- writing a large custom feature from scratch before checking for existing capabilities
- treating a `reference-only` capability with `thin-integration-layer` as if the source file itself were already the final runtime surface
- surfacing internal scaffold names or internal field names to end users when a plain-language description would be enough
- overfitting to the currently open file or the most recently discussed internal example
- using a previous scene or prototype name as the main matching strategy instead of decomposing the requested behavior
- editing Toolkit authoring templates when the user actually needs changes in their own local project folder
- mixing runtime integration, generated content, and sync/publish steps into one vague answer without choosing a primary route first
