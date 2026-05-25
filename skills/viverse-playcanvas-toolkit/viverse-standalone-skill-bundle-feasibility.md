# VIVERSE Standalone Skill Bundle Feasibility

This note evaluates whether the current `skills` and `prompts` in this repo can be packaged into one standalone bundle that still works outside this repository.

## Short Answer

Yes, the idea is feasible, but not as a plain copy of the current skill and prompt files.

The current bundle is not self-contained because multiple workflows depend on repo-local scripts, templates, code surfaces, catalogs, and governance documents.

## What Exists Today

Current workspace customizations:

- 8 skills under `skills/`
- 4 prompts under `prompts/`

These files already form a coherent workflow graph, but they are tightly coupled to this repository.

## Why A Direct Copy Is Not Yet Standalone

The current customizations depend on three kinds of references.

### 1. Cross-Skill And Cross-Prompt Routing

These are references such as:

- `../viverse-leaderboard/SKILL.md`
- `../viverse-cli-publish/SKILL.md`
- `../playcanvas-local-sync/SKILL.md`

These are portable as long as the copied bundle preserves the same relative folder structure.

### 2. Repo-Local Documentation And Governance References

These are references such as:

- `../../../README.md`
- `../../../toolkit-capability-catalog.md`
- `../../../viverse-leaderboard-integration-contract.md`

These can be made portable by rewriting them to public GitHub links.

### 3. Repo-Local Executable And Source References

These are references such as:

- `../../../scripts/create-leaderboard-runtime-boundary.mjs`
- `../../../scripts/validate-leaderboard-integration.mjs`
- `../../../scripts/templates/leaderboard/leaderboard-runtime-boundary.mjs.template`
- `../../../packages/network/src/index.ts`

These are the blocking dependency class.

If the bundle is exported without these assets, then any skill that claims grounded executable support becomes weaker than the current repo-local workflow.

## Feasibility Decision

The standalone idea is feasible only in one of these two forms.

### Option A: Full Standalone Bundle

Bundle these together:

1. all skills
2. all prompts
3. required governance docs
4. required catalogs
5. required helper scripts
6. required templates or example artifacts

Then rewrite local links so they resolve within the bundle root.

This is the only option that preserves the current grounded claims for workflows such as leaderboard and default-room multiplayer.

### Option B: Thin Standalone Workflow Bundle

Bundle only the skills and prompts, and rewrite repo-local references to public GitHub pages under the upstream repository.

This is lighter, but some workflows must be downgraded from executable support to guidance or routing support only.

This option is acceptable only if the exported text explicitly stops claiming local helper execution unless the helper assets are included.

## Important Constraint About The GitHub Reference Target

The idea of pointing to a "latest release branch" is only partly safe.

Current remote branches include:

- `origin/main`
- `origin/develop`
- `origin/release-please--branches--develop`
- `origin/release-please--branches--develop--components--viverse-playcanvas-toolkit`

There is no single simple stable branch named `release`.

Because of that, a standalone bundle should prefer one of these instead:

1. a specific Git tag or release tag
2. a dedicated exported branch created for the bundle
3. `main` only if mutable references are acceptable

If the bundle points at a moving branch without pinning, grounded claims can drift away from the exported skill text.

## Current Workflow Classes

### Strong Candidates For Standalone Export

- `choose-viverse-workflow`
- `toolkit-build-and-package`
- `toolkit-publish-troubleshooting`
- `viverse-cli-publish`

These are mostly routing, diagnostics, and workflow explanation layers.

### Exportable But Asset-Sensitive

- `compose-toolkit-capabilities`
- `viverse-leaderboard`
- `viverse-default-room-multiplayer`

These depend more heavily on catalogs, contracts, validators, helper scripts, or runtime templates.

### Prompt Layer

The prompt files are exportable, but some of them assume the same repo-local helper and catalog surfaces as the skills they invoke.

## Recommended Packaging Direction

If the goal is "one bundle that still works with the same truthfulness standard", use Option A.

That means creating a dedicated export folder that contains:

1. `skills/`
2. `prompts/`
3. selected root governance documents
4. selected helper scripts and templates
5. selected catalogs

Then rewrite internal links to be bundle-relative instead of repo-relative.

## Recommended First Export Scope

Start with this bounded export set first:

1. `choose-viverse-workflow`
2. `compose-toolkit-capabilities`
3. `viverse-leaderboard`
4. `viverse-default-room-multiplayer`
5. `toolkit-build-and-package`
6. `toolkit-publish-troubleshooting`
7. `viverse-cli-publish`

This set preserves the main user-facing routing graph.

## Practical Conclusion

The idea is viable.

What is not viable is treating the current files as already standalone just because their local references can be replaced with GitHub URLs.

For the workflows that currently claim grounded executable support, the exported bundle must either:

1. include the referenced executable assets, or
2. weaken those claims to guidance-only wording

## Recommended Next Action

Create a dedicated export target such as `standalone-skill-bundle/` and explicitly choose one export mode:

1. full self-contained bundle with assets
2. thin bundle with public GitHub references and reduced executable claims