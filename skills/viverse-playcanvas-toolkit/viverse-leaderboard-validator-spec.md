# VIVERSE Leaderboard Validator Spec

This document defines the smallest real validator or helper that satisfies Section G for leaderboard promotion.

It now doubles as the behavior spec for the implemented helper at [scripts/validate-leaderboard-integration.mjs](./scripts/validate-leaderboard-integration.mjs).

The spec remains useful because future changes to that helper should stay within this boundary.

## Purpose

The current leaderboard workflow line now has:

- a promotion-ready review outcome inside the current first-version boundary
- a readiness spec that defines the promotion bar
- a narrow integration contract for the current first-version workflow

What it still lacked was a real grounding artifact that can validate whether a user project is a plausible target for leaderboard integration.

This spec defines the minimum validator needed to close that gap.

## Artifact

Implemented form:

- an executable repo-local helper script at [scripts/validate-leaderboard-integration.mjs](./scripts)

Alternative acceptable form:

- a helper script with a different name under [scripts](./scripts), as long as it preserves the same checks defined here

The implementation style must stay compatible with the existing repo helper pattern used by [scripts/setup-playcanvas-sync.mjs](./scripts/setup-playcanvas-sync.mjs) and [scripts/validate-default-room-multiplayer.mjs](./scripts/validate-default-room-multiplayer.mjs).

## Promotion Role

This validator satisfies the Section G requirement for:

- "A helper or validator exists that checks the project target and basic leaderboard prerequisites."

This document now describes the implemented artifact and the minimum behavior it must continue to preserve.

## Supported Use Case

The validator must support only the narrow first-version workflow:

- leaderboard integration in a user-owned local project
- target runtime bootstrap is `scripts/index.mjs` or a clearly provided equivalent
- intended outcome is one score submit path plus one ranking readback shape
- app identity and leaderboard Studio Meta Name are already known or explicitly reported missing

The validator must not claim to support:

- multi-board orchestration
- generic scoreboard architecture
- storage coupling
- multiplayer coupling
- arbitrary leaderboard SDK design work

## Minimum Inputs

The validator accepts these inputs.

Required:

- `--project-dir <absolute-path>`

Optional:

- `--runtime-entry <path>`
- `--app-id <id>` or equivalent app identity input name
- `--leaderboard-key <meta-name>`
- `--mode <submit|readback|both>`
- `--strict`

Default behavior:

- if `--runtime-entry` is omitted, the validator must look for `scripts/index.mjs` under the project directory first
- if `--mode` is omitted, treat the check as generic leaderboard eligibility rather than one narrower behavior mode

## Minimum Checks

The validator must perform these checks in order.

### 1. Project Directory Check

Confirm that:

- the provided project directory exists
- it is not this Toolkit repo root unless the user explicitly intends internal maintenance

Fail clearly if the directory is missing.

### 2. Runtime Entry Check

Confirm that:

- the runtime bootstrap file exists
- the preferred default is `scripts/index.mjs`
- if a different runtime entry is provided, the validator reports that it is using that path instead

Fail clearly if no usable runtime bootstrap file can be found.

### 3. Supported Entry Surface Check

Confirm that the target file is meant to be the user-owned runtime entry rather than a Toolkit authoring file.

Minimum rule:

- reject obvious Toolkit internal paths in this repo as the default user-project target

### 4. Repo Capability Check

Confirm that the repo-local prerequisite surfaces still exist by checking at least these facts:

- [packages/account/src/index.ts](./packages/account/src/index.ts) exists
- [scripts/publish-build-output-to-viverse.mjs](./scripts/publish-build-output-to-viverse.mjs) exists
- [viverse-leaderboard-integration-contract.md](./viverse-leaderboard-integration-contract.md) exists

Optional stronger version:

- inspect those files and confirm they still expose the expected auth or app-target prerequisite surface

### 5. App Identity Check

Confirm that the request is not missing app identity.

At minimum, the validator must:

- accept a provided app ID or equivalent identity input
- fail clearly when no app identity is provided
- avoid pretending that publish success alone proves leaderboard readiness

### 6. Leaderboard Meta Name Check

Confirm that the request includes the leaderboard Studio Meta Name that the code will use as the leaderboard key.

At minimum, the validator must:

- accept a provided leaderboard Studio Meta Name
- reject Meta Name values that contain characters outside letters, numbers, and `~@$-,.`
- fail clearly when it is missing

### 7. Mode Compatibility Check

Confirm that the request stays within the first leaderboard boundary.

At minimum, the validator must:

- accept `submit`
- accept `readback`
- accept `both`
- reject or warn on unsupported modes

### 8. Bootstrap Guidance Check

If the runtime entry exists, the validator must report that the project has a plausible landing surface for first-version leaderboard integration.

It does not need to modify the file.

It only needs to say whether the landing surface appears valid.

## Output Contract

The validator must produce plain-language output with one of these results:

### Pass

Meaning:

- the project directory exists
- a plausible runtime entry exists
- the repo-local prerequisite surfaces exist
- app identity is present
- leaderboard Meta Name is present
- the requested mode stays within the first leaderboard boundary

Recommended output shape:

- status: pass
- project target: detected path
- runtime entry: detected path
- app identity: validated
- leaderboard Meta Name: validated
- mode: validated mode
- next action: safe next step for leaderboard integration

### Fail: Missing Project Target

Meaning:

- the project directory is invalid or missing

Recommended output shape:

- status: fail
- reason: missing or invalid project folder
- next action: ask for a valid local project folder

### Fail: Missing Runtime Entry

Meaning:

- the project exists, but no supported runtime bootstrap file was found

Recommended output shape:

- status: fail
- reason: runtime entry not found
- next action: ask for `scripts/index.mjs` or the equivalent runtime bootstrap file

### Fail: Missing App Identity

Meaning:

- the project target exists, but the workflow still lacks a valid app identity input

Recommended output shape:

- status: fail
- reason: app identity missing or invalid
- next action: provide the app identity used by the target world before leaderboard integration continues

### Fail: Missing Leaderboard Meta Name

Meaning:

- the workflow still lacks the Studio Meta Name that the code will use as the leaderboard key

Recommended output shape:

- status: fail
- reason: leaderboard Meta Name missing
- next action: provide the exact Studio Meta Name that the code should use as the leaderboard key; if the leaderboard does not exist yet, create it in Studio with both Display Name and Meta Name

### Fail: Invalid Leaderboard Meta Name

Meaning:

- the provided Meta Name contains characters that Studio does not allow

Recommended output shape:

- status: fail
- reason: leaderboard Meta Name invalid
- next action: use the exact Studio Meta Name. It may contain only letters, numbers, and `~@$-,.`. Display Name is a separate Studio label.

### Fail: Unsupported Scope

Meaning:

- the requested mode or workflow exceeds the first leaderboard boundary

Recommended output shape:

- status: fail
- reason: request exceeds first leaderboard workflow boundary
- next action: keep broader leaderboard planning in governance docs only or use a broader future contract

### Fail: Repo Capability Missing

Meaning:

- the repo-local prerequisite surfaces no longer exist where expected

Recommended output shape:

- status: fail
- reason: repo prerequisite surface missing or changed
- next action: re-check the evidence chain before using the leaderboard workflow

## Guardrails

Any implementation of this validator must enforce all of these rules.

1. Do not modify user files.
2. Do not claim that validation success means generic leaderboard support is complete.
3. Do not treat remote skill wording as equivalent to local implementation proof.
4. Do not silently fall back to Toolkit internal files as the user-project target.
5. Do not accept storage-heavy or multiplayer-heavy leaderboard requests as valid first-version scope.

## CLI Shape

The executable helper must keep a clear CLI similar to the other scripts in [scripts](./scripts).

Recommended usage:

```bash
node scripts/validate-leaderboard-integration.mjs \
  --project-dir /absolute/path/to/world \
  --app-id your-app-id \
  --leaderboard-key my-score \
  --mode both
```

## Maintenance Rule

If future changes alter the validator, they must preserve the exact bounded checks above before leaderboard remains treated as formal support.
