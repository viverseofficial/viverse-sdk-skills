---
name: viverse-utility-app
description: Build mobile-first VIVERSE utility tools and widgets using blank-webapp-v1 (no Lambda) or lambda-tool-v1 (Lambda-backed external APIs). Covers polls, countdowns, tickers, dashboards, and any iframe-embeddable tool app.
prerequisites: [viverse-auth, viverse-key-protection-lambda, viverse-template-generation]
tags: [viverse, utility, tool, mobile, iframe, widget, lambda, blank-webapp, lambda-tool]
---

# VIVERSE Utility App Skill

Use this skill when building non-game utility tools for VIVERSE — polls, countdowns, data dashboards, tickers, welcome screens, or any app intended to run on mobile or embed as an iframe widget in a VIVERSE world panel.

## When To Use This Skill

Use when the request is:
- A tool, widget, or utility — NOT a game
- Intended for mobile users or iframe embedding
- Needs VIVERSE auth (optionally or required)
- May need to call external APIs securely (weather, prices, AI, maps)

Do NOT use for game templates (tankarena-3d-v1, starter-kit-racing-v1, redpointfish-v1) or R3F/PlayCanvas projects.

## Template Selection

### Use `blank-webapp-v1` when:
- No external API calls needed
- Auth is optional (app works without login)
- Examples: poll/voting widget, countdown timer, world welcome screen, profile showcase

### Use `lambda-tool-v1` when:
- External API calls required (prices, weather, AI inference, maps, etc.)
- API keys must be kept secret — never in frontend
- Auth is required (Lambda invoke needs accessToken + userId)
- Examples: market ticker, weather widget, AI chat, leaderboard display from external source

**Decision rule**: if the feature needs a third-party API key → `lambda-tool-v1`. Otherwise → `blank-webapp-v1`.

## Mandatory Workflow

1. Load registry to confirm template exists and is active.
2. Load contract from `templates/<id>/template.json` and `TEMPLATE.md`.
3. Respect immutable/editable split — never modify immutable files.
4. Build app logic only in `src/app.js` and editable surface.
5. For Lambda templates: add event scripts in `lambda/` only, never hardcode secrets.
6. Run static certification gates before marking complete.
7. Emit run report with files changed and gate outcomes.

## Immutable Files — Never Touch

### blank-webapp-v1
- `src/viverseConfig.js` — App ID resolution (runtime-config-or-hostname)
- `src/viverseAuth.js` — Auth bootstrap with full profile fallback chain
- `src/main.js` — App mount + auth parallel init; app must work without auth

### lambda-tool-v1 (includes all of above, plus)
- `src/viverseLambda.js` — Play SDK invoke wrapper; roomId synthesis, Key/Value decode, timeouts

**If you find yourself editing these files for any reason, stop. The issue is elsewhere.**

## Editable Surface

### blank-webapp-v1
- `src/app.js` — All app UI and logic; exports `createApp(el)` and `onAuthChange(authState)`
- `index.html` — Runtime config block (`window.__APP_CONFIG__`), title, global styles
- `public/` — Static assets
- `rulesets/` — App behavior parameters

### lambda-tool-v1 (includes all of above, plus)
- `lambda/*.js` — One file per external API event; use `getEnv()` + `reply()`
- `.env.lambda.example` — Document required Lambda env keys per event

## App Architecture Patterns

### blank-webapp-v1: createApp contract
```js
// src/app.js must export this shape
export function createApp(rootEl) {
  return {
    mount({ appId, appName }) { /* initial render */ },
    onAuthChange(authState) {
      // authState = { status, isAuthenticated, profile }
      // profile = { displayName, accountId, accessToken, avatarUrl }
    }
  };
}
```

### lambda-tool-v1: invoke pattern
```js
// Inside app.js — call after auth resolves with valid token
import ViverseLambda from './viverseLambda.js';

const result = await ViverseLambda.invoke(
  'my_event',                      // must match lambda/my_event.js filename
  { param: value },                // context.data in lambda script
  authState.profile.accessToken,
  { appId: APP_CONFIG.appId, userId: authState.profile.accountId }
);
// result is already decoded from Play SDK Key/Value format
if (!result?.success) throw new Error(result?.error);
```

### lambda-tool-v1: event script shape
```js
// lambda/my_event.js
var apiKey = getEnv('MY_API_KEY');
if (!apiKey) { reply({ success: false, error: 'missing MY_API_KEY' }); }
else {
  var input = context.data || {};
  // validate input
  var resp = fetch(endpoint, { headers: { Authorization: 'Bearer ' + apiKey } });
  if (resp.status !== 200) { reply({ success: false, error: 'fetch failed', status: resp.status }); }
  else {
    // sanitize — never return raw upstream response or secrets
    reply({ success: true, data: sanitized });
  }
}
```

## Runtime Config Pattern

Both templates use a runtime config block in `index.html`:

```html
<script>
  window.__APP_CONFIG__ = {
    clientId: "YOUR_APP_ID",   // replaced at publish time
    appName: "My Tool",
    versionName: "1.0.0"
    // template-specific config here (poll, ticker, etc.)
  };
</script>
```

`viverseConfig.js` reads this on load. `clientId` can also be resolved from the VIVERSE hostname automatically — do not hardcode real App IDs in the template.

## Mobile / iframe Rules (Non-Negotiable)

- Root element: `min-height: 100dvh` — never `height: 100vh` or `overflow: hidden` on root
- Touch targets: minimum 44×44px
- No hover-only interactions — all interactions must work on touch
- Test at 375px viewport width — this is the mobile baseline
- App must not crash when `window.viverse` is absent
- `blank-webapp-v1`: show login prompt but keep core UI functional without auth
- `lambda-tool-v1`: show login gate (not blank screen) when unauthenticated

## Lambda-Specific Rules

- `invoke()` is **job-style** — minimum 30s between calls for polling/auto-refresh
- Never call `invoke()` in a tight loop or per-frame
- Lambda init (`newMultiplayerClient` + `init()`) is handled by `viverseLambda.js` — do not re-implement
- The `roomId` is synthetic (`lambda-{appId}`) — no matchmaking room needed
- Handle all non-success statuses: `failed`, `timeout`, `unauthorized`, `configuration_error`
- Show a user-readable error message, never expose raw Lambda error to UI

## Distilled Lessons

1. **Auth failure must not blank the screen.** Always mount app first, run auth in parallel. Show login prompt, not empty div.
2. **Never gate `createApp()` on auth result.** `main.js` calls `mount()` immediately, auth result arrives via `onAuthChange()`.
3. **`viverseLambda.js` Key/Value decode is essential.** Play SDK returns `[{Key, Value}]` arrays — skipping `_decodePlayLambdaValue` gives you unusable data.
4. **Refresh timer minimum is 30s.** `invoke()` has overhead — tighter intervals will stack and degrade UX.
5. **`clientId: "YOUR_APP_ID"` must stay in template.** Never commit a real App ID to the template source.
6. **`lambda/` scripts are editable — add freely.** One file per API capability. Keep immutable `viverseLambda.js` untouched.
7. **`overflow: hidden` on body breaks iframe embedding.** Use `min-height: 100dvh` + `overflow-y: auto` instead.
8. **Test graceful degradation first.** Run the app locally without a real App ID — it should render and show a login prompt, not a JS error.

## Checklist

- [ ] Template selected correctly (blank-webapp-v1 vs lambda-tool-v1)
- [ ] Immutable files untouched (viverseConfig, viverseAuth, main, viverseLambda if applicable)
- [ ] `src/app.js` exports `createApp(el)` with `mount()` and `onAuthChange()` shape
- [ ] `index.html` has `window.__APP_CONFIG__` block with `clientId: "YOUR_APP_ID"`
- [ ] Root layout uses `min-height: 100dvh`, no `overflow: hidden`
- [ ] All touch targets ≥ 44×44px
- [ ] Login prompt shown (not blank) when unauthenticated
- [ ] Lambda only: `invoke()` not called in tight loop (min 30s interval)
- [ ] Lambda only: event script uses `getEnv()`, validates input, sanitizes output
- [ ] Lambda only: all non-success statuses handled in client
- [ ] Certification gates pass (registry entry, immutable paths, rulesets dir)
- [ ] Run report lists files changed and gate outcomes

## Output Requirements

When using this skill, output:
- Template chosen and reason
- Files created or modified (path + purpose)
- Gate results (pass/fail + reason)
- Any blocked writes with path and rule violated
- Publish checklist (App ID, Lambda env if applicable)

## Read Order

1. This file
2. `../viverse-key-protection-lambda/SKILL.md` (if using lambda-tool-v1)
3. `../viverse-auth/SKILL.md`
4. `../viverse-template-generation/SKILL.md`
