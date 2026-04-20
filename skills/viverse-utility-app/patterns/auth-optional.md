# Auth Optional Pattern (blank-webapp-v1)

Use this pattern when auth improves the experience but the app must work without it.

## Core Rule

**Mount first. Auth second. Never gate mount on auth.**

```js
// main.js (immutable — shown for reference)
const app = createApp(root);
app.mount({ appId, appName });        // immediate — no waiting

auth.initialize().catch(() => {});    // parallel — result via callback
```

## App State Machine

```
authStatus: 'idle'
    ↓ (auth.initialize() called)
authStatus: 'detecting'
    ↓ (SDK found or timeout)
authStatus: 'ready'
    isAuthenticated: true  → show user identity, enable auth-gated features
    isAuthenticated: false → show login prompt, keep core features accessible
```

## UI Rules

- Always render something on first paint — never wait for auth
- Show a login button when `authStatus === 'ready' && !isAuthenticated`
- Show a loading indicator when `authStatus === 'detecting'`
- Keep core app functionality (poll options, countdown, content) visible regardless of auth state
- Auth-gated features (save preferences, personalized data) are additive — they enhance but don't gate

## Anti-Patterns

```js
// ❌ Wrong — blanks screen until auth resolves
const user = await auth.initialize();
if (!user) return;
app.mount();

// ✅ Correct — app always mounts
app.mount();
auth.initialize().then(/* delivered via onAuthChange */);
```

## onAuthChange Shape

```js
// Delivered to app.onAuthChange(authState)
{
  status: 'ready',
  isAuthenticated: true,
  profile: {
    displayName: 'Casper',
    accountId: 'abc123',
    accessToken: 'eyJ...',
    avatarUrl: 'https://...'
  }
}
```

Always read `status` before `isAuthenticated` — `isAuthenticated: false` during `detecting` is not a final answer.
