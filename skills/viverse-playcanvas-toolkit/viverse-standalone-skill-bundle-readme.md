# VIVERSE PlayCanvas Toolkit Skills Bundle

This document is the bundle-native entry note for the exported standalone workflow pack.

## What This Bundle Contains

This bundle packages the current user-facing skills and prompts from VIVERSE PlayCanvas Toolkit together with the supporting assets required by the stronger workflows.

Included high-level surfaces:

1. skills under `skills/`
2. prompts under `prompts/`
3. capability catalogs
4. selected contracts, review notes, and runtime test docs
5. selected helper scripts and templates
6. selected source evidence for multiplayer and leaderboard workflows

## Entry Points

If you are browsing the bundle directly, start here:

1. workflow chooser: `skills/choose-viverse-workflow/SKILL.md`
2. feature composition: `prompts/compose-viverse-feature.prompt.md`
3. publish workflow: `skills/viverse-cli-publish/SKILL.md`
4. leaderboard workflow: `skills/viverse-leaderboard/SKILL.md`
5. default-room multiplayer workflow: `skills/viverse-default-room-multiplayer/SKILL.md`

## Link Strategy

The exported bundle keeps the internal folder structure close to the original repository layout.

Because of that, the core skill and prompt markdown links continue to resolve inside the bundle without requiring a second link-mapping layer.

## Trust Levels

### Guidance-First Workflows

These are closest to standalone guidance:

1. workflow choice
2. packaging checks
3. publish routing
4. bounded troubleshooting

### Asset-Backed Workflows

These workflows remain grounded because this bundle includes their supporting assets:

1. one-board leaderboard workflow
2. default-room multiplayer workflow
3. composition workflow that depends on the bundled capability catalog

## Important Constraint

This bundle is self-contained relative to the files included in the zip.

It is not the same as claiming every workflow is independent of supporting assets.

Some workflows are truthful only because the bundle carries helper scripts, templates, contracts, and source evidence together with the skill text.

## Related Notes

1. `standalone-skill-bundle.export-manifest.json`
2. `viverse-standalone-skill-bundle-feasibility.md`
3. `viverse-standalone-skill-bundle-audit.md`