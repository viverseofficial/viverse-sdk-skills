---
name: viverse-auth
description: VIVERSE Login SDK integration for user authentication and SSO
prerequisites: [VIVERSE SDK script tag, VIVERSE Studio App ID]
tags: [viverse, authentication, login, sso]
---

# VIVERSE Auth Integration


Add VIVERSE user authentication to any web project. Supports SSO across VIVERSE experiences.

## When To Use This Skill

Use this when a project needs:
- User login/logout via VIVERSE accounts
- Access to user profile data (name, avatar URL, account ID)
- Single Sign-On between multiple VIVERSE experiences

## Read Order

1. This file
2. [patterns/robust-profile-fetch.md](patterns/robust-profile-fetch.md)
3. [examples/react-login-flow.md](examples/react-login-flow.md)

## Prerequisites

1. **VIVERSE SDK** loaded in `index.html`:
```html
<script src="https://www.viverse.com/static-assets/viverse-sdk/index.umd.cjs"></script>
```

2. **App ID** from [VIVERSE Studio](https://studio.viverse.com/) — create a World App to get one.

## Preflight Checklist

- [ ] `VITE_VIVERSE_CLIENT_ID` is set and matches target app
- [ ] SDK script is loaded before auth calls
- [ ] App uses one auth state source (App/AuthProvider)
- [ ] UI does not render raw `account_id` as display name

## Mandatory Compliance Gates (MUST PASS)

These are release blockers for any auth integration task:

1. **MUST** implement the **Iframe Handshake Delay**: wait 1200ms after SDK detection before first `client.checkAuth()`.
2. **MUST** use auth domain `account.htcvive.com` for `new vSdk.client(...)`.
3. **MUST** use the Avatar SDK constructor with base URL `https://sdk-api.viverse.com/`.
4. **MUST** pass token as `accessToken`, `token`, and `authorization` when constructing `new vSdk.avatar(...)`.
5. **MUST NOT** use request header/key `accesstoken` (lowercase); it is blocked in production CORS preflight.
6. **MUST** run this profile strategy order: `avatarClient.getProfile()` -> `client.getUserInfo()` -> `client.getUser()` -> `client.getProfileByToken(token)` -> direct API fallback.
   Continue to the next strategy whenever profile is missing or missing required identity/avatar fields.
7. **MUST NOT** display `account_id` (full or partial) as username in UI fallback.
8. **MANDATORY (Version Traceability)**: generated auth code must include a `VERSION_NAME` constant logged on startup.
9. **MUST** run auth bootstrap exactly once per page mount/session (guard with `useRef`); do not re-run full `initialize()->checkAuth()` due to hook dependency churn.
10. **MUST** use the currently detected SDK instance for profile strategies in the same init cycle (do not rely on async `setSdk` state before calling `avatar.getProfile()`).
11. **MUST** apply bridge-ready retry for profile enrichment: when `vSdk.bridge.isReady === false`, wait 500ms before profile fallback chain.
12. **MUST NOT** downgrade profile quality: generic fallback names (`VIVERSE Player`/`Player-*`) must not overwrite a previously resolved specific name.
13. **MUST** use a single auth service as source of truth; do not keep parallel `ViverseService` implementations in different folders.
14. **MUST** resolve App ID robustly: use `VITE_VIVERSE_CLIENT_ID` when valid, and in Worlds iframe fallback to hostname-derived app id (`<appId>-preview.world.viverse.app` -> `<appId>`).

## Implementation Workflow

### 1. Initialize the Client

```javascript
const vSdk = window.viverse || window.VIVERSE_SDK || window.vSdk;

const client = new vSdk.client({
    clientId: 'YOUR_APP_ID',            // From VIVERSE Studio
    domain: 'account.htcvive.com'        // MANDATORY: Do not use viverse.com for the auth domain
});
```

> [!IMPORTANT]
> The SDK may expose itself as `window.vSdk`, `window.viverse`, or `window.VIVERSE_SDK` depending on the version. Always check all candidates.

## 1.5 Bridge Resilience Pattern

To avoid "openUrl" destructuring crashes during initialization, you must wait for the VIVERSE message bridge:

```javascript
const detectSdk = () => {
  const vSdk = window.viverse || window.VIVERSE_SDK || window.vSdk;
  const bridgeReady = vSdk && (vSdk.bridge ? vSdk.bridge.isReady !== false : true);

  if (vSdk?.client && bridgeReady) {
    // Proceed to initialize client
  } else {
    requestAnimationFrame(detectSdk);
  }
};
```

### 1.6 Single-Bootstrap Guard (Critical)

```javascript
const initOnceRef = useRef(false);
useEffect(() => {
  if (initOnceRef.current) return;
  initOnceRef.current = true;
  initialize(); // one-shot
}, []);
```

If this guard is missing, repeated `checkAuth()` cycles can race and leave profile stuck at generic fallback.

### 2. Check Existing Session

```javascript
const result = await client.checkAuth();
if (result) {
    // User is already logged in — but this only gives auth tokens!
    console.log('Token:', result.access_token);
    console.log('Account ID:', result.account_id);
    console.log('Expires in:', result.expires_in, 'seconds');
} else {
    // No active session
}
```

> [!CAUTION]
> `checkAuth()` does **NOT** return user profile data (display name, avatar). It only returns `access_token`, `account_id`, and `expires_in`. See step 2b below.

### 2b. Get User Profile (Canonical Robust Pattern)

`checkAuth()` gives token/account identity, then profile must be recovered with a deterministic fallback chain.

```javascript
const vSdk = window.viverse || window.VIVERSE_SDK || window.vSdk;
const appId = import.meta.env.VITE_VIVERSE_CLIENT_ID;
const auth = await client.checkAuth();
if (!auth?.access_token) return null;

let mergedProfile = null;
const token = auth.access_token;
const accountId = auth.account_id;

const merge = (p) => {
  if (!p || typeof p !== 'object') return;
  mergedProfile = mergedProfile ? { ...mergedProfile, ...p } : { ...p };
};

// 1) Avatar SDK primary path (tank-aligned)
if (vSdk?.avatar) {
  try {
    const avatarClient = new vSdk.avatar({
      baseURL: 'https://sdk-api.viverse.com/',
      accessToken: token,
      token,
      authorization: token,
      appId,
      clientId: appId,
    });
    merge(await avatarClient.getProfile());
  } catch (_) {}
}

const hasIdentity = (p) =>
  !!(p && (p.name || p.displayName || p.display_name || p.nickName || p.nickname || p.userName || p.email));
const hasAvatar = (p) =>
  !!(p && (p.activeAvatar?.avatarUrl || p.avatarUrl || p.avatar_url || p.profilePicUrl));
const needsMoreProfile = (p) => !p || !hasIdentity(p) || !hasAvatar(p);

// 2) Bridge-safe fallback
if (needsMoreProfile(mergedProfile) && client?.getUserInfo) {
  try { merge(await client.getUserInfo()); } catch (_) {}
}

// 3) Legacy fallback
if (needsMoreProfile(mergedProfile) && client?.getUser) {
  try { merge(await client.getUser()); } catch (_) {}
}

// 4) Token-based fallback
if (needsMoreProfile(mergedProfile) && client?.getProfileByToken) {
  try { merge(await client.getProfileByToken(token)); } catch (_) {}
}

// 5) Optional direct API fallback (environment-dependent, may be blocked by CORS)
if (needsMoreProfile(mergedProfile)) {
  try {
    const resp = await fetch('https://account-profile.htcvive.com/SS/Profiles/v3/Me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok) merge(await resp.json());
  } catch (_) {}
}

const displayName =
  mergedProfile?.displayName ||
  mergedProfile?.display_name ||
  mergedProfile?.name ||
  mergedProfile?.nickname ||
  mergedProfile?.userName ||
  mergedProfile?.email ||
  'VIVERSE Player';

const avatarUrl =
  mergedProfile?.activeAvatar?.headIconUrl ||
  mergedProfile?.activeAvatar?.head_icon_url ||
  mergedProfile?.headIconUrl ||
  mergedProfile?.head_icon_url ||
  mergedProfile?.avatarUrl ||
  mergedProfile?.avatar_url ||
  null;

setUser({
  accountId,
  accessToken: token,
  displayName,
  avatarUrl,
});
```

> [!TIP]
> Use the reusable helper in [patterns/robust-profile-fetch.md](patterns/robust-profile-fetch.md) so every project applies the same fallback order.

### 3. Login (Redirect-based SSO)

```javascript
client.loginWithWorlds({ state: 'optional-custom-value' });
// This redirects the page to VIVERSE login
// After login, user is redirected back with a session
```

### 4. Logout

```javascript
await client.logout();
// Then re-check auth state in app logic.
// In many React apps, avoid forced reload and refresh state instead.
```

## SDK Loading Pattern

The SDK loads asynchronously. Poll for it:

```javascript
async function waitForSDK(maxAttempts = 50, interval = 100) {
    return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
            attempts++;
            const vSdk = window.viverse || window.VIVERSE_SDK;
            if (vSdk?.client) {
                resolve(vSdk);
            } else if (attempts > maxAttempts) {
                console.warn('VIVERSE SDK failed to load');
                resolve(null);
            } else {
                setTimeout(check, interval);
            }
        };
        check();
    });
}
```

## Recommended Integration Blueprint (React)

Use this structure to avoid the common auth bugs:

1.  **Single source of auth state** in `App` (or a single AuthProvider).
2.  Pass `user/loading/error/login/logout` down to UI components (`AuthGate`, `Lobby`) via props/context.
3.  Keep VIVERSE SDK calls in a service layer (`ViverseService`), not inside multiple UI components.
4.  Build profile data with the canonical multi-strategy fetch (`avatar.getProfile` -> `getUserInfo` -> `getUser` -> `getProfileByToken` -> API fallback).

Minimal component wiring:

```jsx
function App() {
  const { user, loading, error, login, logout } = useViverseAuth();
  return (
    <AuthGate user={user} loading={loading} error={error} login={login}>
      <Lobby user={user} onLogout={logout} />
    </AuthGate>
  );
}
```

> [!IMPORTANT]
> Do not call `useViverseAuth()` separately in both `App` and `AuthGate`/`Lobby`. That creates desynced states.

## Profile Display Best Practices

- Prefer profile fields (`name`, `displayName`, `display_name`, `userName`, `email`) for UI.
- Treat raw `account_id` as an internal identifier only.
- If profile is missing, use generic fallback `VIVERSE Player` only (never append account fragments).
- Surface avatar via `headIconUrl`/`activeAvatar.headIconUrl` when available.

## Verification Checklist

- `checkAuth()` returns `access_token` and `account_id`
- profile fetch returns at least one of: display name, email, avatar
- UI shows profile identity, not raw UUID
- UI does not show partial UUID/account fragments either (for example `VIVERSE Player ab12cd`)
- UI fallback name is exactly `VIVERSE Player` when identity is unavailable

## Critical Gotchas

- **Mock mode for local dev**: The SDK requires HTTPS and a registered redirect URI. For local development, create a mock service that simulates checkAuth/login/logout.
- **Token expiry**: `expires_in` is in seconds. Refresh the session before it expires for long-running experiences.
- **Flat namespace**: Some SDK versions don't have a `client` constructor — the namespace itself has methods directly. Handle both cases.
- **checkAuth ≠ profile**: `checkAuth()` only returns auth tokens, NOT user profile data. Use the full fallback chain, not `checkAuth()` fields alone.
- **Iframe Auth Hang (`checkAuth:ack`)**: If the application hangs on VIVERSE Studio or logs `unhandled methods: VIVERSE_SDK/checkAuth:ack`, it is almost always caused by an **App ID mismatch**. The VIVERSE parent iframe security model prevents the auth handshake if `clientId` (from your `.env` file) does not exactly match the App ID the iframe was launched with. Double check copied `.env` files.
- **Placeholder App ID trap**: If `.env` still has `VITE_VIVERSE_CLIENT_ID=YOUR_APP_ID`, auth may silently fall back to guest mode in preview even when publish uses correct `--app-id`. Build/runtime must resolve a real app id (env or iframe hostname fallback).
- **TypeError: Cannot read properties of null (reading 'accountId')**: This occurs when `getProfile()` returns null (often due to App ID mismatch or invalid token) and the code tries to access `profile.accountId` without a check. **Safety Fix**: Always use optional chaining `profile?.accountId` or a null-guard `if (profile)`.
- **Build-time env trap (Vite/React)**: `import.meta.env.VITE_*` is compiled at build time. If App ID changes, update `.env` and run a fresh `npm run build` before publishing. Re-publishing an old `dist` keeps the old/invalid App ID and causes guest-mode auth.
- **`unauthorized origin` console noise**: Logs like `Received message from unauthorized origin: https://www.viverse.com` commonly indicate parent-iframe auth security rejecting the handshake (usually App ID mismatch, or redirect URI/origin not registered in Studio). Verify App ID + Studio auth settings together.
- **Silent SSO Failure (Guest Mode Loop)**: Local development might work with manual login, but in VIVERSE Worlds, the user expects automatic SSO. If `checkAuth()` returns `null`, do NOT silently fall back to guest mode without logging a clear warning about `VITE_VIVERSE_CLIENT_ID` mismatch.
- **Wait for Parent Handshake**: In some environments, `checkAuth` might need a few milliseconds after SDK load to establish the iframe message bridge. If `checkAuth` fails immediately, try one retry after 500ms.
- **Duplicate auth hooks create stale UI**: Do not call `useViverseAuth()` in multiple top-level components independently (for example in both `App` and `AuthGate`). Keep one source of truth in `App`, then pass `user/loading/error/login/logout` down via props/context. This prevents "logout button looks fake" and "user info not updating after account switch" behavior caused by desynced local hook state.
- **Logout does not always mean account switch prompt**: VIVERSE SSO can keep a parent session. App-side logout should still clear local state/client and run `checkAuth()` again, but switching to another account may still require explicit SSO sign-out at platform level.
- **Do not expose account IDs in UI names**: Profile fetch can fail or return sparse data. Never render `account_id` directly or partially as display name. Prefer profile name/email, then generic `VIVERSE Player`.

## References

- [react-login-flow.md](examples/react-login-flow.md)
- [patterns/robust-profile-fetch.md](patterns/robust-profile-fetch.md)
