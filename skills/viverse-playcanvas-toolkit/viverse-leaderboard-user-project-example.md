# VIVERSE Leaderboard User-Project Example

This document is a real example artifact for the narrow leaderboard contract in [viverse-leaderboard-integration-contract.md](./viverse-leaderboard-integration-contract.md).

It shows the minimum landing shape in a user-owned local project.

It does not claim that this repo already has a fully verified leaderboard helper or a production-ready leaderboard client surface.

## What This Example Proves

This example proves only these things:

- a first-version leaderboard request should land in the user's runtime bootstrap file
- app identity and leaderboard Meta Name must be known before leaderboard work begins
- one score submit trigger and one ranking readback target can be named concretely
- the current local proof boundary can be shown honestly without inventing broader support

## What This Example Does Not Prove

This example does not prove:

- that the repo already ships a verified leaderboard SDK wrapper
- that arbitrary score submit and readback calls are already implemented locally
- that multi-board or generic ranking UI workflows are supported
- that storage or multiplayer coupling is already solved

## Example Target

User project folder:

- `/absolute/path/to/world`

Runtime landing file:

- `/absolute/path/to/world/scripts/index.mjs`

Example first-version goal:

- submit one final score when the round ends
- read back one top-entries view for display in the same runtime flow

## Example Integration Shape

```js
// /absolute/path/to/world/scripts/index.mjs

const leaderboardConfig = {
  appId: 'YOUR_APP_ID',
  leaderboardKey: 'my-score',
  readbackView: 'top-entries',
};

function assertLeaderboardPrerequisites(config) {
  if (!config.appId) {
    throw new Error('Missing app identity for leaderboard integration.');
  }

  if (!config.leaderboardKey) {
    throw new Error('Missing leaderboard Meta Name for leaderboard integration.');
  }
}

function onRoundFinished(finalScore) {
  assertLeaderboardPrerequisites(leaderboardConfig);

  // This is the concrete score submit trigger for the first-version example.
  // Replace this boundary only after a verified local leaderboard helper or
  // validator exists for the repo workflow.
  return {
    action: 'submit-score',
    appId: leaderboardConfig.appId,
    leaderboardKey: leaderboardConfig.leaderboardKey,
    score: finalScore,
  };
}

async function loadLeaderboardTopEntries() {
  assertLeaderboardPrerequisites(leaderboardConfig);

  // This is the concrete ranking readback target for the first-version example.
  // The repo does not yet claim a verified local leaderboard client here.
  return {
    action: 'read-top-entries',
    appId: leaderboardConfig.appId,
    leaderboardKey: leaderboardConfig.leaderboardKey,
    readbackView: leaderboardConfig.readbackView,
  };
}

export async function initWorldRuntime() {
  const initialLeaderboardView = await loadLeaderboardTopEntries();

  return {
    leaderboardConfig,
    initialLeaderboardView,
    onRoundFinished,
  };
}
```

## Why This Counts As A Real Example Artifact

This example is concrete in the places that matter for workflow grounding:

1. it names the user-project landing file precisely
2. it names the first-version config boundary precisely
3. it names one score submit trigger precisely
4. it names one readback target precisely
5. it marks the exact point where verified local support still stops

That makes it stronger than contract-only wording, even though it still does not prove a real leaderboard helper exists.

## Cheapest Visible Check

The cheapest visible check for this example is:

- confirm the user project really has `scripts/index.mjs`, a known app identity, a known leaderboard Meta Name, one score trigger, and one readback target

## Stop Notes

Stop and ask for clarification instead of extending this example when any of these are true:

- the project folder is unknown
- the runtime landing file is unknown
- the app identity is unknown
- the leaderboard Meta Name is unknown
- the request expands into multi-board support, generic ranking UI architecture, storage, or multiplayer orchestration

## Current Promotion Effect

This example should be treated as a real user-project example artifact for governance review.

It should not be treated as proof that leaderboard is ready for formal promotion by itself.

Promotion still depends on the remaining checklist items in [viverse-leaderboard-ready-checklist.md](./viverse-leaderboard-ready-checklist.md), especially a real helper or validator and a stronger validation path.
