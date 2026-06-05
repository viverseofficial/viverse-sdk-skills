---
name: viverse-token-gateway
description: Integrate VIVERSE Token Gateway for AI chat in published apps — auth header construction, non-streaming and SSE streaming patterns, rate-limit handling, and error recovery.
prerequisites: [viverse-auth (checkAuth → accessToken), VIVERSE Studio App ID, App registered with Token Gateway in Studio]
tags: [viverse, ai, token-gateway, chat, llm, streaming, sse]
---

# VIVERSE Token Gateway Integration

Use this skill to add AI chat capabilities to a VIVERSE published app. The Token Gateway proxies LLM requests (via OpenRouter) on behalf of the app owner — **no API keys are ever exposed to the browser**.

## When To Use This Skill

- Add AI NPC dialogue, hint systems, or conversational UI to a VIVERSE world/game
- Need access to LLM models (GPT-4o, Claude, etc.) from browser or PlayCanvas/Three.js code
- Want usage billed to the app owner, not managed per end-user

## Read Order

1. This file
2. [patterns/chat-request.md](patterns/chat-request.md) — non-streaming chat
3. [patterns/streaming-chat.md](patterns/streaming-chat.md) — SSE streaming via Viverse Morph

## Prerequisites

> [!CAUTION]
> **AGENT INSTRUCTION — BLOCKING PREFLIGHT. DO NOT SKIP.**
>
> Before writing any Token Gateway code, you MUST ask the user the following two questions and wait for answers:
>
> 1. **"Is VIVERSE SSO (`viverse-auth` / `checkAuth()`) already integrated in this project?"**
>    - If **NO** → tell the user: *"Token Gateway requires VIVERSE SSO auth first. I'll integrate `viverse-auth` before proceeding with Token Gateway."* Then read and implement `viverse-sdk-skills/skills/viverse-auth/SKILL.md` completely before continuing.
>    - If **YES** → confirm `accessToken` is available at call time and `VIVERSE_APP_ID` is resolved (non-empty) before proceeding.
>
> 2. **"Is this app registered in VIVERSE Studio with an AI quota assigned?"**
>    - If **NO** → tell the user to go to [https://studio.viverse.com](https://studio.viverse.com), open the app, and enable Token Gateway access. The integration will return `403` until this is done.
>    - If **YES** → proceed.
>
> Do not assume auth is in place. Do not proceed with token-gateway implementation until both questions are answered.

This skill **requires** `viverse-auth` to be implemented first.

1. **User is authenticated** — `checkAuth()` has been called and returned a valid `accessToken`.
2. **App ID** — available as `VITE_VIVERSE_CLIENT_ID` or equivalent. This is a public value, not a secret.
3. **App is registered** — creator has registered the app in VIVERSE Studio and configured an AI quota. If not registered, Token Gateway returns `403`.

> Do NOT proceed with this skill until `viverse-auth` integration is complete and working.

## Preflight Checklist

- [ ] `viverse-auth` is integrated and `accessToken` is available at call time
- [ ] `VITE_VIVERSE_CLIENT_ID` (App ID) is set and matches the Studio-registered app
- [ ] App is registered and has an active AI quota in Studio
- [ ] `AccessToken` header uses exact casing (not `accesstoken` — lowercase is blocked by production CORS)
- [ ] `X-App-Id` header is set to the public App ID string
- [ ] Rate limit errors (429) are handled with `Retry-After` backoff

## Mandatory Compliance Gates (MUST PASS)

These are release blockers for any token-gateway integration task:

1. **MUST** obtain `accessToken` via `viverse-auth` before any Token Gateway call. Do not hardcode tokens.
2. **MUST** send `AccessToken: <htc-jwt>` with exact casing — `accesstoken` (lowercase) is blocked in production CORS preflight.
3. **MUST** send `X-App-Id: <appId>` header on every request. This is how the gateway resolves the OR key and applies the correct quota.
4. **MUST NOT** store or log the `accessToken` beyond the current session.
5. **MUST** handle `429 Too Many Requests` — read `Retry-After` header (seconds) and back off before retrying.
6. **MUST** handle `401 Unauthorized` by re-running the auth flow (`checkAuth()`) before retrying once. Do not retry 401 more than once.
7. **MUST** handle `403 Forbidden` as a non-retryable app registration error — surface to developer, not end user.
8. **MUST** handle `503 Service Unavailable` (provider key resolution failed) gracefully in UI.
9. **MUST** use the Viverse Morph SSE relay endpoint for streaming responses — Token Gateway `/v1/chat/stream` is for internal use; client apps reach streaming via Morph.
10. **MUST** include a `VERSION_NAME` constant in generated gateway integration code, logged on startup.
11. **MUST NOT** fall back to a direct OpenRouter call if Token Gateway fails — surface the error instead of bypassing the gateway.
12. **MUST** specify `Content-Type: application/json` on all POST requests.

## Architecture

```
Published App (browser)
    │
    │  AccessToken: <htc-jwt>
    │  X-App-Id: my-game-001
    ▼
Service Gateway (SG Nginx)          ← verifies accessToken via AKS
    │                                  injects X-HTC-Account-Id + X-HTC-Auth-Client
    ├──── non-streaming ──────────► Token Gateway → OpenRouter
    │
    └──── streaming (SSE) ────────► Viverse Morph → Token Gateway → OpenRouter
                                       (Morph holds vvai_ internal token)
```

Billing is charged to the **app owner** (by `appId` in Studio registry), not the end user.

---

## Endpoint Reference

| Endpoint | Path | Auth |
|---|---|---|
| Non-streaming chat | `POST /v1/chat` | `AccessToken` + `X-App-Id` (via SG) |
| Streaming chat (SSE) | Viverse Morph relay URL | `AccessToken` + `X-App-Id` (via SG) |
| Available models | `GET /v1/models` | none |
| Usage stats | `GET /v1/usage?appId=...` | `AccessToken` + `X-App-Id` (via SG) |

**Base URL (via SG):** `https://token-gateway.viverse.com`  
**Morph SSE relay URL:** `https://morph.viverse.com/api/chat/stream` *(confirm with platform team)*  
**Dev URL (skip auth):** `http://localhost:4000` with `DEV_SKIP_AUTH=1`

---

## Implementation Workflow

### 1) Obtain accessToken (prerequisite)

You must complete `viverse-auth` before this step. The token comes from `checkAuth()`:

```javascript
// Assumes viverse-auth integration is already in place
const authResult = await client.checkAuth();
const accessToken = authResult?.access_token;

if (!accessToken) {
  // Trigger login flow — do not call Token Gateway without a token
  throw new Error('User not authenticated');
}
```

### 2) Non-streaming chat request

See [patterns/chat-request.md](patterns/chat-request.md) for the full service implementation.

Quick reference:

```javascript
const response = await fetch('https://token-gateway.viverse.com/v1/chat', {
  method: 'POST',
  headers: {
    'AccessToken': accessToken,       // exact casing — NOT 'accesstoken'
    'X-App-Id': appId,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-4o-mini',      // optional — gateway falls back to app default
    messages: [
      { role: 'system', content: 'You are a helpful in-game assistant.' },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 512,
  }),
});

if (!response.ok) {
  await handleGatewayError(response);
  return;
}

const data = await response.json();
const reply = data.choices[0].message.content;
```

### 3) Streaming chat request (SSE)

See [patterns/streaming-chat.md](patterns/streaming-chat.md) for the full implementation.

Streaming goes through **Viverse Morph** (not Token Gateway directly). Morph holds an internal `vvai_` service token and relays SSE to the client.

```javascript
const response = await fetch('https://morph.viverse.com/api/chat/stream', {
  method: 'POST',
  headers: {
    'AccessToken': accessToken,
    'X-App-Id': appId,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ messages, model: 'openai/gpt-4o-mini' }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split('\n');
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6).trim();
    if (payload === '[DONE]') return;
    const chunk = JSON.parse(payload);
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) onChunk(delta);  // update UI incrementally
  }
}
```

### 3b) Dev vs Demo/Prod Auth Routing

Projects always need a local dev setup. Use an environment flag to switch between direct bearer auth (dev) and SG/SSO path (demo/prod). Do not hardcode either path:

```javascript
const GATEWAY_ENV = localStorage.getItem('gw_env') || 'demo'; // 'dev' | 'demo' | 'prod'

const GW_URLS = {
  dev:  location.hostname === 'localhost' ? `${location.protocol}//${location.host}` : 'http://10.x.x.x:4000',
  demo: 'https://token-gateway.viverse.com',
  prod: '', // set via config
};

async function buildAuthHeaders() {
  if (GATEWAY_ENV === 'dev') {
    // Dev path: pre-provisioned vvai_* token, no SSO required
    const token = localStorage.getItem('gw_dev_token');
    if (!token) throw new Error('Dev mode requires a vvai_* Gateway Token');
    return { 'Authorization': `Bearer ${token}` };
  } else {
    // Demo / Prod path: VIVERSE SSO via SG Nginx
    // SG validates AccessToken, injects X-HTC-Account-Id, forwards to gateway
    const accessToken = await ensureVivAuth(); // from viverse-auth
    if (!accessToken) throw new Error('VIVERSE login required');
    // 'AccessToken' MUST be exact casing — 'accesstoken' lowercase is CORS-blocked in production
    return {
      'AccessToken': accessToken,
      'X-App-Id': APP_ID,
    };
  }
}
```

> [!IMPORTANT]
> Default `GATEWAY_ENV` to `'demo'` (not `'dev'`) in published apps. If it defaults to `'dev'`, the SSO path is never exercised and users will see a "missing token" error in production.

### 4) Rate Limit Handling

The gateway enforces two independent buckets — both return `429` with `Retry-After`:

| Bucket | Key | Default limit |
|---|---|---|
| App aggregate | `ownerTenantId:appId` | 100 req/min (Studio-configured) |
| Per-user | `userAccountId:appId` | `min(appLimit/5, 20)` req/min |

```javascript
async function callGatewayWithRetry(payload, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(GATEWAY_URL, payload);
    if (response.status !== 429) return response;

    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    }
  }
  throw new Error('Rate limit exceeded — please try again later');
}
```

### 5) Error Handling Summary

```javascript
async function handleGatewayError(response) {
  switch (response.status) {
    case 401:
      // Re-authenticate once, then retry
      await reAuthenticate();
      break;
    case 403:
      // App not registered in Studio — developer issue, not user issue
      console.error('[TokenGateway] App not registered or quota exhausted.');
      showDeveloperAlert('AI features unavailable — check Studio app registration.');
      break;
    case 429:
      // Handled by callGatewayWithRetry above
      showUserMessage('Too many requests — please wait a moment.');
      break;
    case 503:
      // Gateway cannot resolve provider key — transient
      showUserMessage('AI service temporarily unavailable.');
      break;
    default:
      console.error('[TokenGateway] Unexpected error', response.status);
  }
}
```

---

## Runtime Preflight

- [ ] User auth is complete (`accessToken` present and not expired)
- [ ] `appId` is correctly set from `VITE_VIVERSE_CLIENT_ID`
- [ ] Network request includes both `AccessToken` and `X-App-Id` headers
- [ ] `429` handler reads `Retry-After` and waits before retry
- [ ] `401` handler triggers `checkAuth()` re-run once
- [ ] `403` is surfaced as developer/config error — not retried
- [ ] SSE streaming uses Morph relay endpoint, not Token Gateway directly

## Models

Use `GET /v1/models` to list available models. Recommended defaults:

| Use case | Model |
|---|---|
| General chat / NPC dialogue | `openai/gpt-4o-mini` |
| Complex reasoning / storytelling | `openai/gpt-4o` |
| Fast, low-cost responses | `openai/gpt-3.5-turbo` |
| Vision (image input) | `openai/gpt-4o` |

If `model` is omitted from the request body, Token Gateway falls back to the app's configured default in Studio, then to `gpt-4o-mini`.
