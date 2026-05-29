# VIVERSE Standalone Skill Bundle Audit

This report reviews the current exported bundle and classifies each skill or prompt by how close it is to functioning as a truly standalone workflow.

The audited artifact is the exported zip:

- `/Users/Steven.YA_Chen/Downloads/viverse-playcanvas-toolkit.zip`

## Audit Outcome

The exported bundle is usable as a portable workflow pack, but the workflows do not all have the same level of independence.

There are three practical classes.

## Class A: Close To Standalone

These workflows are mostly routing, explanation, or bounded troubleshooting layers.

They still benefit from included docs, but they do not depend heavily on executing repo-local helper assets during normal use.

### Skills

1. `skills/choose-viverse-workflow/SKILL.md`
2. `skills/toolkit-build-and-package/SKILL.md`
3. `skills/toolkit-publish-troubleshooting/SKILL.md`
4. `skills/viverse-cli-publish/SKILL.md`

### Why They Are Close

- They are mostly decision, routing, or prerequisite workflows.
- They can still answer usefully even when the user only needs guidance.
- Their repo references are mainly evidence links rather than required runtime assets.

## Class B: Standalone Only Because Supporting Assets Were Bundled

These workflows are valid inside the exported zip because the bundle includes the scripts, templates, contracts, or catalogs they rely on.

Without those assets, their grounded claims would weaken.

### Skills

1. `skills/compose-toolkit-capabilities/SKILL.md`
2. `skills/viverse-playcanvas-leaderboard/SKILL.md`
3. `skills/viverse-default-room-multiplayer/SKILL.md`
4. `skills/playcanvas-local-sync/SKILL.md`

### Why They Need Bundled Assets

`compose-toolkit-capabilities`

- depends on `toolkit-capability-catalog.md`
- depends on `toolkit-capability-catalog.json`
- its routing quality drops immediately if the catalog is absent

`viverse-playcanvas-leaderboard`

- depends on `scripts/create-leaderboard-runtime-boundary.mjs`
- depends on `scripts/validate-leaderboard-integration.mjs`
- depends on `scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template`
- depends on leaderboard governance docs for bounded claims

`viverse-default-room-multiplayer`

- depends on `scripts/validate-default-room-multiplayer.mjs`
- depends on `packages/network/...` source evidence
- depends on multiplayer contract documents for scope boundaries

`playcanvas-local-sync`

- is more operational than conceptual
- its most truthful guidance still assumes a workflow connected to repo helper behavior and wrapper expectations

## Class C: Prompt Layer That Inherits Dependency From Skills

The prompts are portable, but they are not independent from the skill graph they invoke or the catalogs and helper assumptions behind those skills.

### Prompts

1. `prompts/compose-viverse-feature.prompt.md`
2. `prompts/publish-build-output-to-viverse.prompt.md`
3. `prompts/setup-playcanvas-sync.prompt.md`
4. `prompts/sync-and-publish-viverse-project.prompt.md`

### Key Observation

These prompts are only as standalone as the workflows they route into.

The clearest example is `compose-viverse-feature.prompt.md`, which depends on:

- the capability catalog
- leaderboard workflow routing
- default-room multiplayer routing

## What The Current Zip Already Solves Well

1. It preserves the main routing graph across skills and prompts.
2. It includes the key leaderboard assets required for truthful bounded support.
3. It includes the key multiplayer validation and source evidence required for truthful bounded support.
4. It includes the capability catalog required by compose workflows.
5. It avoids macOS-specific hidden files.

## What The Current Zip Does Not Yet Solve

1. It does not yet rewrite all internal references into a clean bundle-native link strategy.
2. It does not yet pin upstream references to a stable release tag.
3. It does not yet separate "guidance-only" workflows from "executable-grounded" workflows in a visibly different export contract.
4. It still reflects the current repo structure rather than a polished public bundle structure.

## Recommended Trust Levels For Consumers

### Safe To Treat As Portable Guidance

- workflow choice
- publish routing
- packaging checks
- bounded troubleshooting

### Safe To Treat As Portable Grounded Workflow Only Because This Zip Includes Assets

- one-board leaderboard workflow
- default-room multiplayer workflow
- composition workflow that depends on the bundled capability catalog

## Recommended Next Improvement

If this bundle will be shared externally, the next cleanup step should be:

1. rewrite internal links so they resolve cleanly inside the exported folder structure
2. add a short bundle README that explains which workflows are guidance-first and which rely on bundled executable assets
3. optionally pin any remaining upstream references to a stable Git tag instead of a moving branch

## Practical Summary

The current zip is already a meaningful standalone bundle.

But the strongest statement that remains true is this:

- some workflows are independently portable as guidance
- some workflows are portable only because this zip carries their supporting assets with them

That distinction should stay explicit if the bundle is distributed outside this repo.