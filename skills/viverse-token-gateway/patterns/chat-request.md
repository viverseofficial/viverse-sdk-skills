# Pattern: Non-Streaming Chat Request

Full service class for making non-streaming AI chat requests through VIVERSE Token Gateway.

## When to Use

- NPC dialogue, hint systems, in-game Q&A
- Any AI response where the full text can be shown at once
- Single-turn or multi-turn conversation with message history

## Prerequisites

- `viverse-auth` integration complete — `accessToken` available
- App ID from `VITE_VIVERSE_CLIENT_ID`
- App registered in VIVERSE Studio with AI quota

---

## Implementation

```javascript
// token-gateway-chat.js
// VERSION_NAME must be logged on startup for traceability
const VERSION_NAME = 'token-gateway-chat@1.0.0';

const GATEWAY_BASE_URL = import.meta.env.VITE_TOKEN_GATEWAY_URL
  || 'https://token-gateway.viverse.com';
const APP_ID = import.meta.env.VITE_VIVERSE_CLIENT_ID;

// Maximum automatic retries on 429
const MAX_RATE_LIMIT_RETRIES = 2;

export class TokenGatewayChatService {
  constructor({ getAccessToken }) {
    // getAccessToken: () => Promise<string> — delegate to viverse-auth
    this._getAccessToken = getAccessToken;
    console.log(`[${VERSION_NAME}] initialized`);
  }

  /**
   * Send a single chat completion request (non-streaming).
   *
   * @param {Array<{role: string, content: string}>} messages
   * @param {Object} options
   * @param {string} [options.model]         - OpenRouter model ID (default: gateway app default)
   * @param {number} [options.temperature]   - 0.0–2.0 (default: 0.7)
   * @param {number} [options.max_tokens]    - Max tokens in response (default: 512)
   * @returns {Promise<string>}              - Assistant reply text
   */
  async chat(messages, { model, temperature = 0.7, max_tokens = 512 } = {}) {
    const accessToken = await this._getAccessToken();
    if (!accessToken) throw new Error('[TokenGateway] No accessToken — run viverse-auth first');

    const body = { messages, temperature, max_tokens };
    if (model) body.model = model;

    return this._requestWithRetry(`${GATEWAY_BASE_URL}/v1/chat`, {
      method: 'POST',
      headers: {
        'AccessToken': accessToken,       // exact casing — 'accesstoken' is blocked by CORS
        'X-App-Id': APP_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  /** Internal: fetch with 429 retry-after backoff */
  async _requestWithRetry(url, init, attempt = 0) {
    const response = await fetch(url, init);

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    }

    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
      console.warn(`[TokenGateway] Rate limited — retrying in ${retryAfter}s (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return this._requestWithRetry(url, init, attempt + 1);
    }

    await this._handleError(response);
  }

  async _handleError(response) {
    switch (response.status) {
      case 401:
        throw new GatewayAuthError('Unauthorized — re-run checkAuth() and retry once');
      case 403:
        throw new GatewayConfigError(
          'App not registered in Studio or quota exhausted — check Studio AI configuration'
        );
      case 429:
        throw new GatewayRateLimitError('Rate limit exceeded after retries — back off and try later');
      case 503:
        throw new GatewayUnavailableError('Token Gateway cannot resolve provider key — try again shortly');
      default: {
        const body = await response.text().catch(() => '');
        throw new Error(`[TokenGateway] Unexpected error ${response.status}: ${body}`);
      }
    }
  }
}

// Typed errors for caller discrimination
export class GatewayAuthError extends Error { constructor(m) { super(m); this.name = 'GatewayAuthError'; } }
export class GatewayConfigError extends Error { constructor(m) { super(m); this.name = 'GatewayConfigError'; } }
export class GatewayRateLimitError extends Error { constructor(m) { super(m); this.name = 'GatewayRateLimitError'; } }
export class GatewayUnavailableError extends Error { constructor(m) { super(m); this.name = 'GatewayUnavailableError'; } }
```

---

## Usage — React Hook

```javascript
// useTokenGatewayChat.js
import { useState, useRef } from 'react';
import { TokenGatewayChatService, GatewayAuthError } from './token-gateway-chat';

export function useTokenGatewayChat({ auth, onReAuth }) {
  const serviceRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!serviceRef.current) {
    serviceRef.current = new TokenGatewayChatService({
      getAccessToken: () => auth?.access_token,
    });
  }

  const send = async (messages, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const reply = await serviceRef.current.chat(messages, options);
      return reply;
    } catch (err) {
      if (err instanceof GatewayAuthError) {
        // Re-auth once then retry
        await onReAuth?.();
        return serviceRef.current.chat(messages, options);
      }
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { send, loading, error };
}
```

---

## Usage — Vanilla JS (PlayCanvas / Three.js)

```javascript
import { TokenGatewayChatService } from './token-gateway-chat';

// NPC dialogue example
const gatewayChat = new TokenGatewayChatService({
  getAccessToken: () => window.__viverseAuth?.access_token,
});

const history = [
  { role: 'system', content: 'You are a medieval blacksmith NPC. Stay in character.' }
];

async function askNPC(playerInput) {
  history.push({ role: 'user', content: playerInput });

  const reply = await gatewayChat.chat(history, {
    model: 'openai/gpt-4o-mini',
    max_tokens: 256,
  });

  history.push({ role: 'assistant', content: reply });
  return reply;
}
```

---

## Rate Limit Headers

Every response includes:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1716980460   ← Unix timestamp when bucket refills
```

Two independent buckets — hitting either returns `429`:
- **App bucket**: `ownerTenantId:appId` — set by creator in Studio
- **User bucket**: `userAccountId:appId` — auto-set to `min(appLimit/5, 20)` req/min
