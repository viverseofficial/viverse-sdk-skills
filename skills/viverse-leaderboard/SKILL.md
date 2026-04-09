---
name: viverse-leaderboard
description: How to implement a global leaderboard for VIVERSE worlds using the official VIVERSE gameDashboard SDK
prerequisites: [VIVERSE Auth integration (checkAuth), ViverseService, Viverse Studio App ID]
tags: [viverse, leaderboard, tracking, gamedashboard, api]
---

# VIVERSE Leaderboard Integration

Use `viverse.gameDashboard` to upload and fetch persistent global rankings.

## When To Use This Skill

- Global scoreboards (wins, time, distance, points)
- Top-N ranking views
- Around-user rank queries

## Read Order

1. This file (workflow + constraints)
2. Project leaderboard service implementation
3. Studio leaderboard configuration

## Studio Preflight

Before coding:

1. Registered App ID exists.
2. Leaderboard is created in Studio for that app.
3. You know:
   - Leaderboard API name
   - Data type
   - Sort direction
   - Update rule (append/update/best)

## Operator Steps (Remind User)

When AI assists a user, remind them to complete these Studio steps before test publish:

1. Open target app in VIVERSE Studio (same App ID used in `.env`).
2. Create leaderboard with:
   - API name = `VITE_VIVERSE_LEADERBOARD_NAME` (exact match, case-sensitive)
   - Display name = human-friendly label (can match API name)
   - Data type = `Numerical`
   - Sort direction = `Descending` for score-based games
   - Update rule = `Append` for cumulative points across matches
3. Save/publish Studio configuration changes.
4. Rebuild and republish world after any `.env` App ID or leaderboard-name change.
5. Verify with one authenticated account by uploading one score and reading top 10.

If runtime error contains `Unexpected token '<'` during leaderboard API calls, remind user to re-check:
- App ID in build vs Studio app ID
- Leaderboard API name exact match
- Authenticated (non-guest) session
- Studio leaderboard exists under that same app

## MUST REMIND USER (Non-optional)

For every leaderboard integration task, AI MUST explicitly remind user to complete Studio setup before testing:

1. Create leaderboard in Studio under target app ID.
2. API name must exactly match `VITE_VIVERSE_LEADERBOARD_NAME` (case-sensitive).
3. Confirm type/sort/update rule match game scoring model.
4. Rebuild and republish after any App ID or leaderboard-name env change.

Do not assume Studio setup exists even if code is correct.

## Runtime Preflight

- [ ] Auth success (`access_token` present)
- [ ] `VITE_VIVERSE_CLIENT_ID` matches target app
- [ ] `VITE_VIVERSE_LEADERBOARD_NAME` matches Studio API name
- [ ] Initialize client once per token
- [ ] Prefer dashboard token from `client.getToken()`; fallback to `checkAuth().access_token`
- [ ] Handle API errors in UI (not just console)

## Implementation Workflow

### 1) Initialize Dashboard Client

**CRITICAL**: Use specific URLs and the correct token source to avoid bridge errors.

```javascript
// Step A: Prefer specific dashboard token
let dashboardToken = auth.access_token;
if (client?.getToken) {
    const res = await client.getToken();
    dashboardToken = typeof res === 'string' ? res : (res?.access_token || dashboardToken);
}

// Step B: Initialize with Base URLs
const v = window.vSdk || window.viverse || window.VIVERSE_SDK;
const DashboardClass = v?.gameDashboard || v?.GameDashboard;

const gameDashboardClient = new DashboardClass({
  token: dashboardToken,
  clientId: appId, // Mandatory
  baseURL: "https://www.viveport.com/",         // MANDATORY for production
  communityBaseURL: "https://www.viverse.com/", // MANDATORY for production
});
```

### 2) Upload score

The `name` must exactly match Studio API name.

```javascript
await gameDashboardClient.uploadLeaderboardScore(appId, [
  { name: leaderboardName, value: scoreValue },
]);
```

### 3) Fetch leaderboard

```javascript
const configs = [
  { name: leaderboardName, range_start: 0, range_end: 9, region: "global", time_range: "alltime", around_user: false },
  { name: leaderboardName, range_start: 0, range_end: 9, region: "global", time_range: "alltime", around_user: true },
  { name: leaderboardName, range_start: 0, range_end: 9, region: "local", time_range: "alltime", around_user: false },
];

let rankings = [];
for (const conf of configs) {
    const res = await gameDashboardClient.getLeaderboard(appId, conf);
    // Robust Extraction
    const extracted =
      res?.rankings ||
      res?.ranking ||
      res?.leaderboard_rankings ||
      res?.data?.rankings ||
      res?.data?.ranking ||
      res?.leaderboard?.rankings ||
      res?.leaderboard?.ranking ||
      [];
    if (extracted.length > 0) {
        rankings = extracted;
        break;
    }
}

// Optional read fallback for some deployments
if (rankings.length === 0 && typeof gameDashboardClient.getGuestLeaderboard === "function") {
  for (const conf of configs) {
    const res = await gameDashboardClient.getGuestLeaderboard(appId, conf);
    const extracted =
      res?.rankings ||
      res?.ranking ||
      res?.leaderboard_rankings ||
      res?.data?.rankings ||
      res?.data?.ranking ||
      res?.leaderboard?.rankings ||
      res?.leaderboard?.ranking ||
      [];
    if (extracted.length > 0) {
      rankings = extracted;
      break;
    }
  }
}
```

Fallback query order when `rankings` is empty:

1. `global + around_user=false`
2. `global + around_user=true`
3. `local + around_user=false`

Also support response-shape fallback (`rankings`, `leaderboard_rankings`, nested response objects).

## Scoring Best Practices

- Upload at game checkpoints/end state, not every frame.
- Normalize score values before upload (integer/clamped) to match Studio type.
- Keep scoring logic deterministic and documented.
- Prefer gameplay-derived scores (for example kills) over label-derived scores when debugging ranking correctness.
- Make leaderboard submit idempotent per match result (see below) to avoid duplicate score inflation.
- Keep leaderboard UI collapsible when screen space is limited; default to a launcher icon or compact chip if a persistent panel would cover active gameplay.
- Constrain leaderboard scrolling inside the panel (`max-height` + `overflow-y-auto`) instead of shrinking or obscuring the main game viewport.

## Idempotent Submit Rule (Required)

Leaderboard submit APIs are side-effectful (especially with `Append` update rule).  
Your game MUST prevent duplicate submissions for the same finished match.

Required pattern:

1. Build a stable `resultKey` per match-end event (for example: `matchId + endedAt + winner`).
2. Keep `submittedResultKeyRef` (or equivalent state/ref).
3. Before submit:
   - if same key already submitted, skip upload/fetch.
4. Reset this key only when a new match starts (or user returns to lobby/restart).

Why:
- `onGameEnd` can fire more than once from re-renders, network replays, or lifecycle transitions.
- Without idempotency, scores can keep increasing unintentionally.

## Debugging Playbook (Production-safe)

When leaderboard behaves as "upload success but empty rankings", log:

- upload payload: `appId`, `leaderboardName`, `value`
- token source: `client.getToken` vs `checkAuth`
- fetch config used (`region`, `around_user`, `range_start/end`)
- fetched row count and top-level response keys

Recommended diagnostic line format:

`diag(appId=..., leaderboard=..., tokenSource=..., token=present)`

Interpretation:

- `upload success` + `rows=0` => write path works; investigate fetch params/shape/propagation timing
- `Unexpected token '<'` => backend returned HTML; usually app/name/token mismatch
- browser-extension stack traces (`chrome-extension://...`) are unrelated noise unless they reference app bundle paths
- `rows=0` with `lastUpload.value=0` often means only zero-score results were uploaded; verify with a positive score upload.
- If authenticated `getLeaderboard` remains empty, try `getGuestLeaderboard` as a read fallback for display.
- `HTTP error ... /api/vrleaderboard/v1/apps/<appId>` with `404` means leaderboard backend cannot find that app id; verify leaderboard was created in Studio under the same app and try `VITE_VIVERSE_APP_ID` / `VITE_VIVERSE_CLIENT_ID` candidate fallback.
- Error stacks that reference an old bundle hash (for example previous `index-*.js`) indicate stale cached build; verify latest published hash/build tag before debugging logic.

## App Scope and Naming

Leaderboard lookup key is: **App ID + Leaderboard Name**.

For test/prod:
- Keep one env variable name (for example `VITE_VIVERSE_LEADERBOARD_NAME`)
- Configure same leaderboard API name in each app
- Ensure runtime App ID points to intended app

## Verification Checklist

- [ ] Authenticated user can upload score successfully
- [ ] Top ranking fetch returns rows in expected order
- [ ] UI handles empty/error states
- [ ] Leaderboard UI does not permanently cover gameplay-critical controls on small screens
- [ ] Test/prod apps both have leaderboard configured in Studio
- [ ] Console shows uploaded value equals expected gameplay score
- [ ] If upload succeeds but list is empty, fallback fetch configs are attempted and logged
- [ ] Repeated end-of-match callback does not cause duplicate leaderboard uploads
- [ ] Console confirms current build tag or latest bundle hash (not stale cached build)

## Critical Gotchas

- APIs require valid auth token; guest users cannot upload.
- Do not spam uploads in render/game loops.
- A leaderboard name valid in app A fails in app B if not configured there.
- Build-time env drift can target wrong App ID; rebuild before publish after env changes.
- `Upload leaderboard record successfully` does not guarantee immediate non-empty ranking rows.
- `THREE.WebGLRenderer: Context Lost` is graphics lifecycle related, not leaderboard API failure.
- Duplicate end callbacks can repeatedly submit scores unless guarded by a per-match idempotency key.

## References

- [viverse-auth](../viverse-auth/SKILL.md)
- [VIVERSE SDK docs](../../docs/viverse_sdk_docs.md)
