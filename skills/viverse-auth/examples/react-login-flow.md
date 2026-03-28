# React Login Flow

Complete React component for VIVERSE authentication.

## ViverseService.js (Service Layer)

```javascript
class ViverseService {
    constructor() {
        this.client = null;
        this.isInitialized = false;
        this.userData = null;
    }

    async init() {
        if (this.isInitialized) return true;

        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                const vSdk = window.viverse || window.VIVERSE_SDK;

                const bridgeReady = vSdk && (vSdk.bridge ? vSdk.bridge.isReady !== false : true);

                if (vSdk?.client && bridgeReady) {
                    try {
                        this.client = new vSdk.client({
                            clientId: import.meta.env.VITE_VIVERSE_CLIENT_ID,
                            domain: 'account.htcvive.com'
                        });
                        this.isInitialized = true;
                        resolve(true);
                    } catch (err) {
                        console.error("SDK init failed:", err);
                        resolve(false);
                    }
                } else if (attempts > 50) {
                    resolve(false);
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    async checkAuth() {
        if (!this.client?.checkAuth) return null;
        const result = await this.client.checkAuth();
        if (result) {
            // Robust Profile Fetch: Try Avatar SDK -> getUserInfo -> getUser -> API
            const accessToken = result.access_token;
            let profile = null;
            const vSdk = window.viverse || window.VIVERSE_SDK;

            // 1. Avatar SDK (Preferred)
            if (!profile && vSdk?.avatar) {
                try {
                    const appId = import.meta.env.VITE_VIVERSE_CLIENT_ID;
                    const avatarClient = new vSdk.avatar({ 
                        baseURL: 'https://sdk-api.viverse.com/', 
                        accessToken,
                        token: accessToken,         // Shotgun key 2
                        authorization: accessToken, // Shotgun key 3 (NEW)
                        appId: appId,
                        clientId: appId
                    });
                    profile = await avatarClient.getProfile();
                } catch (e) { console.warn('Strategy 1 failed', e); }
            }

            // 2. Client Methods (Fallbacks)
            if (!profile && this.client.getUserInfo) {
                try { profile = await this.client.getUserInfo(); } catch (e) {}
            }
            if (!profile && this.client.getUser) {
                try { profile = await this.client.getUser(); } catch (e) {}
            }

            const looksLikeUuid = (value) =>
                typeof value === 'string' &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
            const rawName = profile?.name || profile?.displayName || profile?.display_name || profile?.userName || '';
            const safeName = rawName && !looksLikeUuid(rawName)
                ? rawName
                : `VIVERSE Player ${String(result.account_id || '').slice(0, 6)}`;

            this.userData = {
                displayName: safeName,
                avatarUrl: profile?.activeAvatar?.avatarUrl || profile?.avatarUrl || null,
                headIconUrl: profile?.activeAvatar?.headIconUrl || profile?.headIconUrl || null,
                email: profile?.email || null,
                userId: result.account_id,
                accessToken
            };
        }
        return this.userData;
    }

    async login() {
        if (!this.client?.loginWithWorlds) return null;
        this.client.loginWithWorlds();
    }

    async logout({ reload = false } = {}) {
        if (this.client?.logout) await this.client.logout();
        this.userData = null;
        this.client = null;
        this.isInitialized = false;
        if (reload) window.location.reload();
    }

    getUserData() { return this.userData; }
}

export default new ViverseService();
```

## ViverseLayer.jsx (UI Component)

```jsx
import React, { useState, useEffect } from 'react';
import viverseService from './ViverseService';

const AVATAR_PLACEHOLDER = 'data:image/svg+xml,...'; // Default avatar SVG

export default function ViverseLayer({ onUserChange }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const ok = await viverseService.init();
            if (ok) {
                const userData = await viverseService.checkAuth();
                if (userData) {
                    setUser(userData);
                    onUserChange?.(userData);
                }
            }
            setLoading(false);
        })();
    }, []);

    const handleLogin = async () => {
        setLoading(true);
        await viverseService.login();
    };

    const handleLogout = async () => {
        await viverseService.logout({ reload: false });
        const ok = await viverseService.init();
        const userData = ok ? await viverseService.checkAuth() : null;
        setUser(userData || null);
        onUserChange?.(userData || null);
    };

    if (loading) return null;

    if (!user) {
        return (
            <div className="viverse-overlay">
                <button onClick={handleLogin} className="viverse-login-btn">
                    Login with VIVERSE
                </button>
            </div>
        );
    }

    return (
        <div className="viverse-overlay">
            <div className="viverse-user-profile">
                <img src={user.avatarUrl || AVATAR_PLACEHOLDER} alt="Avatar" />
                <div>
                    <span>{user.displayName}</span>
                    {user.email && <small>{user.email}</small>}
                    <button onClick={handleLogout}>Logout</button>
                </div>
            </div>
        </div>
    );
}
```

## Environment Variables

```env
VITE_VIVERSE_CLIENT_ID=your-app-id-from-viverse-studio
```
