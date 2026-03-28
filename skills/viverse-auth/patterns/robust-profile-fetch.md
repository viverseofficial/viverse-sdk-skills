# Robust Profile Fetch Pattern

In production VIVERSE applications, especially those running inside iframes (like VIVERSE Worlds), the standard Avatar SDK method for fetching user profiles might not always work due to SDK version differences or environmental constraints.

This pattern provides a **"try everything" strategy** to ensure you get the user's display name and avatar thumbnail reliably.

## The Helper Function

Copy this helper into your project (e.g., `utils/viverseHelper.js`):

```javascript
/**
 * Robustly fetches the VIVERSE user profile using multiple strategies.
 * @param {Object} vSdk - The loaded VIVERSE SDK object (window.viverse or window.VIVERSE_SDK or window.vSdk)
 * @param {Object} client - The initialized VIVERSE Auth Client
 * @param {string} accessToken - The access token from checkAuth()
 * @param {string} accountId - The account ID from checkAuth()
 * @returns {Promise<Object>} The profile object { displayName, avatarUrl, headIconUrl }
 */
export async function fetchViverseProfile(vSdk, client, accessToken, accountId, authData = null) {
    let profile = null;

    // Strategy 0: Direct Handshake Recovery (CRITICAL)
    // Often name is hidden in the auth handshake itself before any API call
    if (authData) {
        try {
            const recoveredName = authData.user_name || authData.display_name || authData.email || authData.name;
            if (recoveredName && typeof recoveredName === 'string' && !recoveredName.includes('-')) {
                profile = { ...profile, displayName: recoveredName, name: recoveredName };
            }
        } catch (e) {}
    }

    // Helper checks so we can stop only when identity is actually usable
    const hasIdentity = (p) =>
        !!(p && (p.displayName || p.display_name || p.name || p.nickname || p.userName || p.email));
    const hasAvatar = (p) =>
        !!(p && (
            p.activeAvatar?.headIconUrl ||
            p.activeAvatar?.head_icon_url ||
            p.headIconUrl ||
            p.head_icon_url ||
            p.avatarUrl ||
            p.avatar_url ||
            p.profilePicUrl
        ));

    // Strategy 1: Avatar SDK (Modern Standard)
    if (vSdk?.avatar && accessToken) {
        try {
            const appId = import.meta.env.VITE_VIVERSE_CLIENT_ID;
            const avatarClient = new vSdk.avatar({
                baseURL: 'https://sdk-api.viverse.com/',
                accessToken: accessToken,
                token: accessToken,         // Shotgun key 2
                authorization: accessToken, // Shotgun key 3
                appId: appId,
                clientId: appId
            });
            const p = await avatarClient.getProfile();
            // ACCUMULATE: Merge results, don't just overwrite
            if (p) profile = { ...profile, ...p };
        } catch (e) {}
    }

    const needsMoreProfile = (p) => !p || !hasIdentity(p) || !hasAvatar(p);

    // Strategy 2: client.getUserInfo() (Standard SDK)
    // Continue if profile is missing or incomplete
    if (needsMoreProfile(profile)) {
        if (client?.getUserInfo) {
            try { 
                const p = await client.getUserInfo();
                if (p) profile = profile ? { ...profile, ...p } : p;
            } catch (e) {}
        }
    }

    // Strategy 3: client.getUser() (Legacy/Iframe)
    if (needsMoreProfile(profile)) {
        if (client?.getUser) {
            try { 
                const p = await client.getUser(); 
                if (p) profile = profile ? { ...profile, ...p } : p;
            } catch (e) {}
        }
    }

    // Strategy 4: client.getProfileByToken() (Alternative)
    if (needsMoreProfile(profile)) {
        if (client?.getProfileByToken) {
            try { 
                const p = await client.getProfileByToken(accessToken); 
                if (p) profile = profile ? { ...profile, ...p } : p;
            } catch (e) {}
        }
    }

    // Strategy 5: Direct API Call (Last Resort)
    if (needsMoreProfile(profile) && accessToken) {
        try {
            const resp = await fetch('https://account-profile.htcvive.com/SS/Profiles/v3/Me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (resp.ok) {
                const p = await resp.json();
                if (p) profile = profile ? { ...profile, ...p } : p;
            }
        } catch (e) {}
    }

    const looksLikeUuid = (value) =>
        typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

    const preferredName =
        profile?.name ||
        profile?.displayName ||
        profile?.display_name ||
        profile?.nickName ||
        profile?.nickname ||
        profile?.userName ||
        '';

    const safeDisplayName = preferredName && !looksLikeUuid(preferredName)
        ? preferredName
        : 'VIVERSE Player';

    // Normalize the result
    return {
        displayName: safeDisplayName,
        avatarUrl:
            profile?.activeAvatar?.avatarUrl ||
            profile?.activeAvatar?.avatar_url ||
            profile?.avatarUrl ||
            profile?.avatar_url ||
            profile?.profilePicUrl ||
            null,
        headIconUrl:
            profile?.activeAvatar?.headIconUrl ||
            profile?.activeAvatar?.head_icon_url ||
            profile?.headIconUrl ||
            profile?.head_icon_url ||
            profile?.headIcon ||
            null,
        email: profile?.email || null,
    };
}
```

## Critical Execution Notes (Do Not Skip)

1. **Use resolved SDK instance from current init cycle**
- Pass `resolvedSdk` directly into profile fetch.
- Do not wait for React `setSdk(...)` state propagation before `avatar.getProfile()`.

2. **Bridge wait before profile enrichment**
- If `resolvedSdk?.bridge?.isReady === false`, wait 500ms and then run fallback chain.

```javascript
if (resolvedSdk?.bridge?.isReady === false) {
  await new Promise((r) => setTimeout(r, 500));
}
const fullProfile = await fetchViverseProfile(resolvedSdk, client, token, accountId, authData);
```

3. **No-downgrade merge rule**
- Never overwrite a specific resolved name with generic placeholders (`VIVERSE Player`, `Player-*`).

## Usage Example

```javascript
import { fetchViverseProfile } from './utils/viverseHelper';

async function checkAuth() {
    // ... initialize client ...
    
    // 1. Get Auth Token
    const authResult = await client.checkAuth();
    if (!authResult) return null;

    // 1b. Wait for Bridge Resilience
    const bridgeReady = vSdk && (vSdk.bridge ? vSdk.bridge.isReady !== false : true);
    if (!bridgeReady) {
        console.warn('Bridge not ready, delaying profile fetch...');
        await new Promise(r => setTimeout(r, 500));
    }

    // 2. Fetch Profile Robustly
    const vSdk = window.viverse || window.VIVERSE_SDK || window.vSdk;
    const profile = await fetchViverseProfile(
        vSdk, 
        client, 
        authResult.access_token, 
        authResult.account_id
    );

    return {
        ...profile,
        userId: authResult.account_id,
        accessToken: authResult.access_token
    };
}
```
