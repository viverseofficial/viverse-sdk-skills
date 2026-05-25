# VIVERSE PlayCanvas Toolkit Skills Bundle

This folder is the standalone export of the current VIVERSE PlayCanvas Toolkit skills and prompts.

If you only read one file after unzipping, read this one.

## What This Is

This bundle packages:

1. user-facing skills under `skills/`
2. user-facing prompts under `prompts/`
3. the supporting catalogs, scripts, templates, contracts, and source evidence required by the stronger workflows

The bundle is designed so the included markdown links continue to resolve inside the extracted folder.

## How To Install Into Another Workspace

Use one of these two installation styles.

### Option A: Open The Bundle As Its Own Workspace

Use this when you want the exported workflows exactly as packaged.

1. Unzip `viverse-playcanvas-toolkit.zip`.
2. Keep the extracted folder structure unchanged.
3. Open the extracted folder itself in VS Code as the workspace root.

This is the safest option because all bundled relative links and supporting assets stay in place.

### Option B: Merge The Bundle Into Another Project Workspace

Use this when you want these skills and prompts available inside an existing project.

1. Unzip `viverse-playcanvas-toolkit.zip`.
2. Copy the contents of the extracted folder into the root of the target workspace.
3. Preserve the folder structure exactly.
4. Do not place the contents under an extra nested folder if you want the bundled links to keep working.

In practice, the target workspace should end up with paths such as:

1. `skills/...`
2. `prompts/...`
3. `toolkit-capability-catalog.md`
4. `scripts/...`
5. `packages/network/...`

## What Not To Do

1. Do not copy only `skills/` and `prompts/` by themselves if you want the stronger workflows to remain grounded.
2. Do not use Finder Compress to rebuild the zip if you want to avoid `__MACOSX` metadata.
3. Do not add an extra wrapper folder level around the bundle contents when merging into another workspace.

## Best Entry Points

Start with these files:

1. workflow chooser: `skills/choose-viverse-workflow/SKILL.md`
2. engine-only world creation: `skills/viverse-engine-only-local-world/SKILL.md`
3. feature composition: `prompts/compose-viverse-feature.prompt.md`
4. publish workflow: `skills/viverse-cli-publish/SKILL.md`
5. leaderboard workflow: `skills/viverse-leaderboard/SKILL.md`
6. default-room multiplayer workflow: `skills/viverse-default-room-multiplayer/SKILL.md`

Useful helper scripts for the engine-only route:

1. scaffold: `pnpm create:engine-only-world -- --project-dir /absolute/path`
2. validate a generated world: `pnpm validate:engine-only-world -- --project-dir /absolute/path`
3. run the one-command smoke flow: `pnpm smoke:engine-only-world -- --project-dir /absolute/path --app-id <id>`
4. if you specifically need a local avatar starter for a new or explicitly empty target folder, the agent can use: `pnpm create:engine-only-world -- --project-dir /absolute/path --with-toolkit-player`
5. if you specifically need a Toolkit-ready runtime starter for a new or explicitly empty target folder, the agent can use: `pnpm create:engine-only-world -- --project-dir /absolute/path --with-toolkit-runtime`
6. if you specifically need a sample Toolkit interaction with quest UI for a new or explicitly empty target folder, the agent can use: `pnpm create:engine-only-world -- --project-dir /absolute/path --with-toolkit-quest-ui`
7. the agent can also run the smoke flow with a local avatar starter when that feature is actually needed, but these starter flags are not a replacement path for an already working local world

Normal users do not need to choose Toolkit package sources, transition profiles, or internal support files. Those are handled inside the bundled scripts.

Maintainer-only transition notes remain in `toolkit-source-transition.md` and the `vendor/` folders.
Maintainer-only UX review guidance for non-technical users is in `viverse-nontechnical-user-ux-checklist.md`.
Maintainer-only review guidance for preserving already working worlds while adding new runtime features is in `viverse-skill-acceptance-checklist.md`, under `Cross-Cutting Preservation Principle`.
The maintainer review command for that check is `pnpm review:nontechnical-ux`.
That same check also runs automatically for pull requests and for pushes to `main` and `develop`.
The maintainable rule set for that check lives in `scripts/nontechnical-user-ux.config.json`.
That config also supports per-file rule allowlists when a small number of technical terms are intentionally required.
The maintenance notes for rule naming and allowlist use live in `scripts/nontechnical-user-ux.config-guide.md`.
Maintainer-only Toolkit version refresh steps for the API discovery and routing files live in `scripts/toolkit-version-upgrade-checklist.md`.
The one-command maintainer refresh entry point for that flow is `pnpm refresh:toolkit-api-knowledge -- --scan-root /absolute/path/to/viverse-playcanvas-toolkit-<version>`.
That same command also supports `--apply` when a maintainer intentionally wants to promote the generated proposal into the formal API index in the same run.
For a safer bounded promotion path, the same command also supports `--apply-if-clean`, plus `--max-apply-changes` when a maintainer wants a stricter apply limit.
Run `node scripts/refresh-toolkit-api-knowledge.mjs --check-drift` manually when the Toolkit API knowledge files or their refresh scripts change, so stale generated API knowledge files are caught before release or bundle export.

## Workflow Trust Levels

### Guidance-First Workflows

These are closest to portable guidance:

1. workflow choice
2. packaging checks
3. publish routing
4. bounded troubleshooting

### Asset-Backed Workflows

These remain grounded because this bundle carries their supporting assets with them:

1. engine-only local world workflow with bundled starter templates
2. one-board leaderboard workflow
3. default-room multiplayer workflow
4. composition workflow that depends on the bundled capability catalog

## Bundle Notes

Supporting notes included in this bundle:

1. `viverse-standalone-skill-bundle-readme.md`
2. `viverse-standalone-skill-bundle-feasibility.md`
3. `viverse-standalone-skill-bundle-audit.md`
4. `standalone-skill-bundle.export-manifest.json`
5. `viverse-nontechnical-user-ux-checklist.md`

## Upstream Repository

Original project source:

1. `https://github.com/viverseofficial/viverse-playcanvas-toolkit`

This bundle is an exported workflow pack, not a promise that every included workflow is independent of supporting assets.
