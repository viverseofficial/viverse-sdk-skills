# VIVERSE Leaderboard Real Runtime Test

This document is the shortest real-runtime test flow for the current external test project.

It does not prove formal promotion by itself.

It is only the concrete test procedure for verifying whether the installed leaderboard runtime boundary can talk to the real VIVERSE runtime with the current app identity and leaderboard Meta Name.

## Current Test Target

- Project folder: `/absolute/path/to/world-project`
- Runtime entry: `/absolute/path/to/world-project/scripts/index.mjs`
- App ID: `YOUR_APP_ID`
- Leaderboard Meta Name: `YOUR_LEADERBOARD_META_NAME`
- Preferred preview URL: `YOUR_PREVIEW_URL`

## What Is Already Prepared

These steps are already complete:

1. The external project passed the repo-side validator.
2. The leaderboard runtime boundary was reinstalled with the current app ID and leaderboard Meta Name.
3. The generated runtime entry is syntax-valid.
4. The installed boundary exposes these global helpers:
   - `globalThis.submitLeaderboardScore`
   - `globalThis.readLeaderboardTopEntries`
   - `globalThis.readLeaderboardSelfRank`
   - `globalThis.runLeaderboardSmokeTest`

## Preconditions Before Browser Testing

All of these must be true:

1. You open the world from the preview URL above.
2. You are signed in with a real VIVERSE account.
3. The leaderboard named by your configured key already exists under the same app ID in Studio.
4. The page finishes loading without unrelated fatal runtime errors.

If item 2 or 3 is false, stop there. The runtime test is not meaningful yet.

## Browser Console Test

Open the browser devtools console after the world has fully loaded.

### Step 1: Confirm Helper Installation

Run:

```js
typeof globalThis.runLeaderboardSmokeTest;
```

Expected result:

- `'function'`

If the result is not `'function'`, the installed runtime boundary did not load correctly.

### Step 2: Run the Full Smoke Test

Run:

```js
await globalThis.runLeaderboardSmokeTest(55);
```

Expected pass shape:

- object with `ready`
- object with `submit`
- object with `topEntries`
- object with `selfRank`

Preferred success interpretation:

1. `submit.status === 'submitted'`
2. `topEntries.status === 'readback'`
3. `selfRank.status === 'readback'`
4. no auth-related exception is thrown

### Step 3: Narrow Retest Commands

If you want narrower checks after the full smoke test, run these one by one:

```js
await globalThis.submitLeaderboardScore(55);
```

```js
await globalThis.readLeaderboardTopEntries();
```

```js
await globalThis.readLeaderboardSelfRank();
```

## Pass Signals

Treat the run as a meaningful real-runtime pass only if all of these are true:

1. `submitLeaderboardScore` returns a structured result instead of throwing.
2. `readLeaderboardTopEntries` returns a structured result instead of throwing.
3. `readLeaderboardSelfRank` returns a structured result instead of throwing.
4. The browser console does not show app mismatch, token mismatch, or missing leaderboard errors.

## Fail Signals

These are the most important fail shapes.

### Auth Failure

Examples:

- not signed in
- no token available
- unauthorized response

Interpretation:

- runtime auth state is not ready yet

### App Target Failure

Examples:

- app not found
- 404 under leaderboard API path
- HTML response or `Unexpected token '<'`

Interpretation:

- app ID does not match the configured leaderboard target or the deployed world is pointing at the wrong app

### Leaderboard Meta Name Failure

Examples:

- leaderboard not found
- empty result with clear key mismatch indicators

Interpretation:

- the configured leaderboard Meta Name does not match the Studio Meta Name exactly, or the leaderboard does not exist under the configured app ID

## What To Record Back

If you want to turn this run into promotion evidence, record these exact items:

1. the full returned object from `runLeaderboardSmokeTest(55)`
2. whether you were authenticated at test time
3. whether the configured leaderboard Meta Name was confirmed in Studio under the configured app ID
4. the exact error message if any step failed

## Recorded Result

One external test project has now produced a meaningful real-runtime pass.

Observed results:

1. `submitLeaderboardScore(55)` returned a structured `submitted` result.
2. `readLeaderboardTopEntries()` returned a structured `readback` result through `getLeaderboard()` with at least one ranking row.
3. `readLeaderboardSelfRank()` returned a structured `readback` result through `getLeaderboard()` with `around_user: true` and at least one ranking row.
4. The ranking response metadata reported the configured app ID and leaderboard Meta Name.

## Promotion Meaning

This browser test now supplies the real-runtime evidence that previously blocked promotion.

It still should be reviewed back through [viverse-leaderboard-promotion-review.md](./viverse-leaderboard-promotion-review.md) so the support boundary remains explicit rather than expanding by implication.
