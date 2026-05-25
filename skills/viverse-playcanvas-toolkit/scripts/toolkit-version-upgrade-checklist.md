# Toolkit Version Upgrade Checklist

Use this checklist when the Toolkit source version changes and you want the API-discovery and routing knowledge in this repo to stay current.

This checklist is for maintainers.

## Goal

Refresh generated discovery artifacts first, then review the curated routing knowledge before changing the user-facing skills and prompts.

Do not treat every generated difference as a routing change.

## When To Run This

Run this after either of these happens:

1. the vendored Toolkit package set changes
2. the private Toolkit repo or installed Toolkit package source changes to a new version

## Step 1: Refresh Discovery Inputs

Regenerate the candidate API discovery output from the strongest source evidence you have.

Preferred command:

```sh
pnpm refresh:toolkit-api-knowledge --scan-root /absolute/path/to/viverse-playcanvas-toolkit-<version>
```

If you already reviewed the generated proposal and intentionally want to promote it in the same run, use:

```sh
pnpm refresh:toolkit-api-knowledge --scan-root /absolute/path/to/viverse-playcanvas-toolkit-<version> --apply
```

Do not use `--apply` as the default habit. Review the proposal first unless you already know the curation inputs and thresholds are safe for this upgrade.

If you want a safer bounded promotion in the same run, use:

```sh
pnpm refresh:toolkit-api-knowledge --scan-root /absolute/path/to/viverse-playcanvas-toolkit-<version> --apply-if-clean
```

`--apply-if-clean` only promotes the proposal when it is additive, when it removes no existing APIs, and when the added API count stays within the configured apply limit.

Default guarded limit:

1. `--max-apply-changes 25`

If you want a tighter bound for a sensitive upgrade, lower that limit explicitly.

For CI or pre-merge verification, use:

```sh
pnpm refresh:toolkit-api-knowledge -- --check-drift
```

That mode regenerates the candidate and proposal outputs in a temporary folder, compares them against the checked-in generated files, and fails if the generated knowledge artifacts are stale.

Typical commands:

```sh
pnpm discover:toolkit-api-candidates
node scripts/discover-toolkit-api-candidates.mjs --scan-root /absolute/path/to/viverse-playcanvas-toolkit-<version> --output toolkit-api-discovery-candidates.external.json
```

If the relevant Toolkit version is only visible through installed packages, rerun discovery with the appropriate extra scan roots or `--include-node-modules`.

This repo's `pnpm` scripts call the underlying `node` entrypoint directly, so do not insert an extra standalone `--` before script arguments.

## Step 2: Regenerate The Curated Proposal

Create a proposal from the refreshed candidate file instead of editing the formal API index first.

If you used the one-command refresh flow above, this proposal step already ran for you.

Typical command:

```sh
pnpm curate:toolkit-api-index -- --candidates toolkit-api-discovery-candidates.external.json
```

Default proposal output:

1. `toolkit-api-discovery-index.proposed.json`

## Step 3: Review The Proposal Before Promoting It

Review the proposed additions with these questions:

1. Is this a runtime-facing API the agent should actually route to?
2. Is this API evidence repeated enough to be a stable routing signal?
3. Is this a helper or internal building block that should stay out of the main API index?
4. Does this addition change only API coverage, or does it also change routing guidance?

Be especially careful with:

1. `@viverse/core`
2. `@viverse/config`
3. `@viverse/types`

These packages can contribute useful evidence, but they also generate a lot of low-value routing noise.

## Step 4: Update Formal Knowledge Files Deliberately

If the proposal is good, promote only the reviewed additions into the formal knowledge files.

Files to review and update as needed:

1. `toolkit-api-discovery-index.json`
2. `toolkit-capability-catalog.json`
3. `toolkit-capability-catalog.md`

Do not assume all proposal additions belong in all three files.

Use this rule of thumb:

1. API-level additions belong in `toolkit-api-discovery-index.json`
2. capability or route changes belong in the capability catalogs
3. user-facing wording changes belong in skills or prompts only when routing behavior truly changes

When you enrich `toolkit-api-discovery-index.json`, choose the smallest hint shape that matches the real API surface:

1. use `configFields` when the API is driven by a real config object field and that field meaningfully changes routing or implementation shape
2. use `constructionHints` when the API is usually created from an existing Toolkit or PlayCanvas object and the main risk is wiring it up incorrectly rather than naming one config field
3. use `capabilityHints` when the API already provides an important built-in behavior and the main risk is rebuilding that behavior from scratch

Use these boundaries to keep the discovery index useful without turning it into a TypeDoc mirror:

1. do not add every parameter, property, or private member
2. add only hints that would realistically stop the agent from inventing bespoke polling, wrapper config names, helper state, or replacement UI
3. prefer source-backed field names from Toolkit types or exported class signatures over remembered names or inferred aliases

Quick examples:

1. `EntityTriggerEnterTrigger.tagsFilter` and `filterByPlayer` belong in `configFields`
2. `EntitySelectedTrigger.selectionExcludeTags` belongs in `configFields`
3. `VideoTextureControls` receiving an existing `VideoTexture` belongs in `constructionHints`
4. `SoundControls` providing playback, volume, and seek behavior belongs in `capabilityHints`

## Step 5: Recheck Skills And Prompts Only If Routing Changed

Usually you do not need to touch the user-facing instructions for every Toolkit upgrade.

Review these only when the recommended route, availability claim, or validation expectation changed:

1. `skills/compose-toolkit-capabilities/SKILL.md`
2. `prompts/compose-viverse-feature.prompt.md`
3. other workflow skills affected by the upgraded package area

If the touched workflow can start local preview, recheck its preview wording at the same time:

1. preview must be derived from the target project's own dev or preview command when one exists
2. preview must not default to repo templates, temporary copied template folders, or stale previously used URLs
3. host and port must come from the project or the dev server output unless an exceptional override is explicitly justified

## Step 6: Run Focused Validation

After updating the formal files, run the narrowest checks that match the change:

```sh
node scripts/check-nontechnical-user-ux.mjs
node -e "JSON.parse(require('node:fs').readFileSync('toolkit-api-discovery-index.json','utf8')); JSON.parse(require('node:fs').readFileSync('toolkit-capability-catalog.json','utf8')); console.log('json-ok')"
node scripts/validate-toolkit-api-regressions.mjs
node scripts/refresh-toolkit-api-knowledge.mjs --check-drift
```

If the upgrade changed a starter, flow, or routed feature area, also rerun the matching validator or smoke flow.

If the changed workflow can open local preview, also re-read the final wording and confirm it does not tell the agent to invent a preview port before inspecting the target project.

## Practical Summary

For most version upgrades:

1. run `pnpm refresh:toolkit-api-knowledge --scan-root /absolute/path/to/viverse-playcanvas-toolkit-<version>`
2. review the generated proposal
3. promote only the confirmed changes
4. rerun focused validation

If you are intentionally applying the reviewed proposal in one step:

1. run `pnpm refresh:toolkit-api-knowledge --scan-root /absolute/path/to/viverse-playcanvas-toolkit-<version> --apply`
2. rerun focused validation

If you want the safer bounded apply path instead:

1. run `pnpm refresh:toolkit-api-knowledge --scan-root /absolute/path/to/viverse-playcanvas-toolkit-<version> --apply-if-clean`
2. lower `--max-apply-changes` when you want a stricter safety bound
3. rerun focused validation

If you need the manual path instead:

1. rerun discovery
2. rerun curation
3. review the proposal
4. promote only the confirmed changes
5. rerun focused validation

That is usually enough to keep the repo's API-awareness current without turning every version bump into a full documentation rewrite.

Run the drift check manually whenever the Toolkit API knowledge files or their refresh scripts change.

When a pull request changes preview-related skill or prompt wording, review that diff with one extra question: would this wording make an agent start the user's real project preview, or would it let the agent drift into a template server or self-chosen port?