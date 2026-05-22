---
name: viverse-template-generation
description: Build, certify, and evolve file-backed VIVERSE templates with high-risk/editable contracts and runtime-safe generation rules.
prerequisites: [template-registry, contract-schema, orchestrator-enforcement]
tags: [templates, architecture, orchestration, compliance, battletanks]
---

# VIVERSE Template Generation Skill

Use this skill when implementing or evolving the internal template system (registry, contracts, enforcement, certification) and when onboarding a new game template.

## Core Rules

1. Load registry entry, `template.json`, and `TEMPLATE.md` before generation.
2. Prefer building in editable paths. High-risk (immutablePaths) files CAN be modified when needed — read fully, patch surgically, verify syntax.
3. Validate scenario/ruleset compatibility before workspace creation.
4. Run static/build/runtime gates before promoting template changes.
5. Record explicit run-report events for template selection, high-risk file writes, and gate outcomes.

## High-Signal Lessons

0. **Every template directory MUST have `rulesets/default.json`** or `TemplateCertificationService`
   blocks all runs with 'no ruleset files found'. Minimum content:
   `{"id":"default","name":"Default","description":"...","authRequired":true,"mobileFirst":true,"iframeEmbeddable":true}`
   See `templates/REQUIRED_STRUCTURE.md` for the full required directory layout.

1. Do not replace game bootstrap with an auth-only shell. Startup must still launch the world/game loop.
2. Gameplay/UI changes must not rewrite protected bootstrap/runtime files unless a verified blocker proves it is necessary.
3. Template shells must remain playable on short viewports; avoid fixed full-screen layouts that hide gameplay/UI below the fold.
4. Auth/profile recovery must continue past generic placeholders.
5. Once an App ID is created and written to `.env`, treat it as locked for the workspace.
6. Separate first-publish logic from republish logic.
7. Overlay panels must not permanently cover active gameplay.
8. Preview-shell success is not runtime certification; require browser/probe evidence.

9. **`template.json` MUST declare `buildConfig`** or agents default to the blank-webapp Vite pattern
   (creating `vite.config.js`, running `npm run build`) — which breaks static PlayCanvas/game templates.
   Minimum for static templates: `"buildConfig": {"type":"static","command":"<cp command>","outputDir":"dist","entryHtml":"index.html"}`
   Minimum for Vite templates: `"buildConfig": {"command":"npm run build","outputDir":"dist","entryHtml":"index.html"}`

10. **Static PlayCanvas templates MUST set `enforcement.defaultMode: "enforce"`** (not `"audit"`).
    With `"audit"`, contract violations (writing `vite.config.js`, `src.js`) are silently allowed,
    causing the Coder to build a Vite app instead of the PlayCanvas game — blank runtime at publish time.

11. **Never read `playcanvas-stable.min.js`, `*.min.js`, or binary/media files** — they blow the LLM
    context window and cause auth/logic tasks to timeout. The file service now blocks these reads
    automatically, returning `[FILE BLOCKED]`. Use `grep` or targeted file inspection instead.
    For App ID injection in non-Vite templates, use a sed-style replacement on the placeholder
    `YOUR_APP_ID` — pre-inject this placeholder in the template source's config file.

12. **Fast-path template modification (visual/asset-only changes) must NOT re-scaffold.** When the user
    requests only cosmetic changes to a seeded template workspace (e.g. "change ring to bird", "stylize
    the aircraft"), the workspace is already copied from the template source. Do NOT run `npm install`,
    do NOT re-seed, do NOT re-create the folder structure. Apply ONLY the specific string/value changes
    to editable files, then build if `build.required` is true. Leave `YOUR_APP_ID` in place for the
    publish step.

13. **`CONTRACT.json` is auto-generated for fast-path runs** — it does NOT need to be created by an
    Architect task. The system derives it from `template.json` `buildConfig` at seeding time. Do NOT
    search for it in nested paths or run `find` commands to locate it; it is always at the workspace
    root. If a `cat CONTRACT.json` returns an error, run `pwd && ls -la` to confirm you are in the
    correct workspace root (not a double-nested path like `workspaces/.../workspaces/...`).

14. **Scope for `[TEMPLATE_MODIFICATION_ONLY]` tasks is `gameplay + ui + platform-core.bootstrap`.**
    The template contract enforces subsystem scopes. `index.html` is classified as
    `platform-core.bootstrap` — if the scope only includes `gameplay + ui`, writing cosmetic title/theme
    changes to `index.html` will be blocked. The fast-path modify task has `platform-core.bootstrap`
    in its allowed subsystems specifically to permit this. Do NOT escalate scope beyond these three.

15. **`[FAST_PATH]` publish tasks do not emit a formal `SKILL_COMPLIANCE_REPORT` block.** They are
    3-step CLI tasks (login → app create → publish). Absence of the structured compliance report is
    expected and tolerated; the task is not aborted for non-PASS skill compliance. The App ID obtained
    from `viverse-cli app create` is automatically synced to `CONTRACT.json` by the orchestrator —
    there is no need to manually patch it with `sed` unless the build output still contains the
    `YOUR_APP_ID` placeholder.

16. **Art Modularization Assessment is REQUIRED during template extraction.** Before freezing a game
    into a template, scan the source to determine its "theme-swap readiness" level. If the source
    scores below Level 2, perform minimal modularization surgery before packaging.

## Art Modularization Assessment

When extracting a new template, run this assessment on the source code to determine how easy it
will be for agents to swap themes/assets at generation time.

### Scan Process

1. **Grep for a centralized theme/config file** — look for `ThemeConfig`, `Constants`, `THEME`,
   `palette`, or a top-level config object that collects colors/paths in one place.
2. **Grep for hardcoded hex colors** — `0x[0-9a-f]{6}`, `#[0-9a-f]{3,6}`, `hsl(`, `rgb(` in
   scene/rendering files. Count how many unique locations define visual constants.
3. **Check model loading** — are model paths collected in one array/registry, or scattered across
   multiple files? Is there a shared colormap atlas?
4. **Check procedural texture functions** — are they standalone (easy to swap params) or inlined
   inside class methods with game logic mixed in?
5. **Check VFX/particle colors** — centralized or hardcoded per-effect?
6. **Check light/fog/atmosphere** — grouped in one setup block or scattered?

### Readiness Levels

| Level | Name | Criteria | Agent theme-swap cost |
|---|---|---|---|
| **3** | Fully modularized | Centralized `ThemeConfig.js` or equivalent; all colors, model paths, and atmosphere values reference it. One-file change = full retheme. | 1 file edit |
| **2** | Partially modularized | Procedural textures as standalone functions; shared colormap; colors hardcoded but grouped in few files (≤3). | 3-5 edits, same file regions |
| **1** | Scattered | Colors/paths spread across 5+ files, inline in logic, no config object. | 10+ edits across many files, error-prone |
| **0** | Entangled | Visual constants mixed into gameplay math; changing a color could break collision/physics. | Refactor required before theming |

### Minimum Bar for Template Freeze: Level 2

If the source scores Level 1 or 0, apply these **minimal modularization steps** before packaging:

#### Step A: Extract procedural textures to standalone functions (if inlined)
Move any canvas/texture generation into named top-level functions with color parameters at the top:
```javascript
// BEFORE (entangled):
class Scene { build() { ctx.fillStyle = '#1a2e1a'; ... } }

// AFTER (modularized):
function makeGroundTexture(baseColor = '#1a2e1a', noiseHue = 115) { ... }
```

#### Step B: Collect model paths into a single inventory comment or constant
```javascript
// Asset registry — swap these paths for a full model retheme
const MODEL_PATHS = {
  castle: '/assets/castle/',
  enemies: '/assets/enemies/',
  weapons: '/assets/weapons/',
};
```

#### Step C: Group atmosphere values at the top of the scene file
```javascript
// ── Theme atmosphere (edit these for mood changes) ──
const ATMOSPHERE = {
  background: 0x0a0e1a,
  fog: { color: 0x0a0e1a, density: 0.014 },
  ambient: { color: 0x8899bb, intensity: 2.8 },
  sun: { color: 0xfff5dd, intensity: 1.2 },
};
```

#### Step D: Document the shared colormap pattern (if GLBs use texture atlases)
Add a comment at the template level noting which colormap file recolors which model set.

### Documenting the Result

After assessment, record the level and swap instructions in the template's `TEMPLATE.md` under
a `## Art Architecture` section. This tells the fast-path modification agent exactly where to
make edits for theme swaps. Include:
- Readiness level (1-3)
- File locations of each art layer (textures, models, VFX, atmosphere)
- "Fastest swap" recipe (fewest edits for maximum visual change)
- Known limitations (e.g., "model placement is hardcoded — replacing GLBs must match scale/origin")

### Assessment Examples

**dashrunner-v1 → Level 3:** `js/game/ThemeManager.js` has 7 named presets controlling all visuals.
One function call `setTheme('volcanic')` rethemes everything.

**starter-kit-racing-v1 → Level 3:** `js/ThemeConfig.js` + shared colormap atlas. Change palette
PNG or config object = full retheme.

**bastion-archer-v1 → Level 2:** Procedural textures are standalone functions with grouped color
params. Shared colormaps per model category. But no single ThemeConfig — colors are in
SceneBuilder.js functions + atmosphere in constructor. 3-5 edit locations for full retheme.

**flight-simulator-v1 → Level 3:** All visual constants in `src/core/Constants.js`.

## Template Checklist

- [ ] Registry entry exists and template path is real
- [ ] Contract includes `immutablePaths` (advisory high-risk), `editablePaths`, `injectionHooks`, `requiredGates`
- [ ] `scenario.schema.json` exists and matches template/rulesets
- [ ] `rulesets/` exists; if schema references `default`, `rulesets/default.json` exists
- [ ] High-risk file writes are warned (advisory, non-blocking)
- [ ] Startup/bootstrap still launches the world after auth/bootstrap
- [ ] Gameplay remains usable on short/mobile-height viewports
- [ ] Secondary overlays do not obscure active play
- [ ] Run report contains template events and high-risk-write advisory reasons
- [ ] `template.json` includes `buildConfig` with correct `type` (static or vite)
- [ ] `enforcement.defaultMode` is `"enforce"` not `"audit"`
- [ ] Static templates: large engine files (*.min.js, *.bin) are NOT in editablePaths
- [ ] Static templates: App ID placeholder `YOUR_APP_ID` is pre-injected in the config file
  that `appIdPropagation.approvedConfigFiles` points to

### Fast-Path (Visual/Asset Modification) Checklist

- [ ] Workspace is already seeded — do NOT re-scaffold or re-run npm install
- [ ] Read `CONTRACT.json` at workspace root (not a nested path) to get `editablePaths` and `build.required`
- [ ] Apply only the specific named changes (swap strings/values in editable files)
- [ ] If `build.required` is true, run `build.command` once — do NOT run it again in the publish task
- [ ] Leave `YOUR_APP_ID` in source files; the publish step replaces it after `app create`
- [ ] Scope is limited to `gameplay`, `ui`, `platform-core.bootstrap` — do NOT touch auth/matchmaking files

## Output Requirements

When using this skill, output:
- exact files created/updated
- gate results (pass/fail + reason)
- any blocked writes with violating path and rule
- next migration step (if partial rollout)
