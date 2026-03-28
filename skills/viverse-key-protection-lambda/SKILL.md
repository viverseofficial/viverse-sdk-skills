---
name: viverse-key-protection-lambda
description: Protect third-party API keys by moving secret-bearing calls into VIVERSE Play Lambda scripts and keeping only non-secret user data in VIVERSE Storage.
prerequisites: [VIVERSE Play SDK access token flow, Play Lambda Service authkey + game_id, event_name contract, VIVERSE Storage SDK]
tags: [viverse, lambda, storage, secrets, security, api-key]
---

# VIVERSE Key Protection (Lambda + Storage Boundary)

Use this skill when a browser app currently holds third-party API keys (for example Google/Gemini keys) and needs a safe architecture.

## When To Use This Skill

Use this skill when a project needs:
- API key protection in frontend apps
- Lambda env/script/invoke integration
- secure event contracts for AI or external APIs
- clear boundary between secret and non-secret storage

## Read Order

1. This file
2. [patterns/lambda-secret-proxy.md](patterns/lambda-secret-proxy.md)
3. [patterns/storage-boundary.md](patterns/storage-boundary.md)
4. [examples/voxel-landmark-migration.md](examples/voxel-landmark-migration.md)
5. [scripts/sync-lambda-config.sh](scripts/sync-lambda-config.sh) for CI plan/apply bootstrap
6. [templates/.env.lambda.example](templates/.env.lambda.example) for local env setup

## Mandatory Compliance Gates (MUST PASS)

1. **MUST NOT** keep production secrets in `VITE_*` env variables.
2. **MUST** store secrets in Play Lambda Env (`/env`) scoped by `game_id`.
3. **MUST** call secret-bearing external APIs from Lambda script (`getEnv` + `fetch`), not directly from browser code.
4. **MUST** define explicit `event_name` contracts and validate `context.data` fields.
5. **MUST** return sanitized result via `reply(...)`; never return raw secret values.
6. **MUST** keep VIVERSE Storage usage to non-secret user data (cache/preferences/state only).
7. **MUST** include failure-safe client handling for `status` (`failed`, `timeout`, `unauthorized`, `configuration_error`).
8. **MUST** rotate keys using `/env` without requiring frontend redeploy.

## Architecture Rule

- **Lambda Env/Script**: secrets + outbound protected requests
- **Lambda Invoke**: client-to-lambda request path
- **Storage SDK**: user-scoped non-secret persistence

If a value can compromise external services when leaked, it belongs in Lambda Env, not Storage and not frontend env.

## Implementation Workflow

### 1) Inventory and classify existing key usage

Find all references to:
- `VITE_*_API_KEY`
- query string `?key=...`
- outbound `fetch` with secret headers

Classify each call:
- **Move to Lambda**: secret-bearing, low/medium QPS request/response workloads
- **Keep client-side with hard restrictions**: high-frequency streaming paths that cannot use job-style invoke

### 2) Create/update Lambda Env

Store secret values with `/env`:
- `GOOGLE_API_KEY` / `GEMINI_API_KEY`
- endpoint URLs
- optional service-account JSON

Never commit these values to repo.

### 3) Create/update Lambda Script per event

Define one event per backend capability, for example:
- `places_search_event`
- `gemini_chat_event`
- `tiles_root_bootstrap_event` (bootstrap only; not per-tile proxy)

Script requirements:
- read with `getEnv(...)`
- validate input
- call external API with `fetch(...)`
- `reply({ success, ... })`
- include `console.*` logs for jobs debugging

### 4) Invoke from client

Use Play SDK:

```ts
const playClient = new globalThis.viverse.play();
const multiplayerClient = await playClient.newMultiplayerClient(roomId, appId, userSessionId);
await multiplayerClient.init();

const res = await multiplayerClient.lambda.invoke(eventName, eventData, accessToken);
if (res.status !== "succeeded") throw new Error(res.error || res.status);
```

### 5) Storage SDK usage

Allowed in Storage:
- last search query
- user preferences
- cache metadata ids/hashes

Forbidden in Storage:
- API keys
- service account JSON
- upstream bearer tokens

### 6) Decommission frontend secrets

After Lambda path works:
- remove secret `VITE_*` usage from production code
- keep local dev placeholders only when necessary
- add static checks to block key-like literals in bundle

### 7) Automate with manual approval

- Use read-before-write sync in CI (`GET` first, then optional `POST` on approval).
- Generate diff artifacts before apply.
- Do not apply without explicit approval signal.
- Keep `Authkey` outside repo and mask it in logs.
- Run post-apply API tests (`--test`) that assert env keys and script hashes.

## CI Runbook (Retained Fix Pattern)

Use the sync script exactly in this order:

1. Plan only:
   - `bash ./scripts/sync-lambda-config.sh`
2. Verify + test only:
   - `bash ./scripts/sync-lambda-config.sh --verify --test`
3. Apply (manual-approved):
   - `bash ./scripts/sync-lambda-config.sh --approve --verify --test`

Mandatory guardrails:

- Always provide a real target app id, either:
  - `--game-id <REAL_APP_ID>`, or
  - `LAMBDA_GAME_ID=<REAL_APP_ID>` in `.env.lambda.local`.
- `YOUR_APP_ID` is a hard failure and must never be used in apply mode.
- Keep `.env.lambda.local` local-only and never commit real credentials.

Required local env keys (see template):

- `LAMBDA_AUTHKEY`
- `LAMBDA_GAME_ID`
- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_PLACES_TEXT_SEARCH_URL` (optional override)
- `GOOGLE_TILES_API_KEY`
- `GOOGLE_TILES_ROOT_URL` (optional override)

## Verification Checklist

- [ ] No production key in frontend env (`VITE_*`)
- [ ] No key in request URL logs/client console
- [ ] Lambda `/env` contains required secret keys for target `game_id`
- [ ] Script exists for each invoked `event_name`
- [ ] Post-apply API tests pass (env keys present, scripts present/hash-match, jobs API healthy)
- [ ] Client handles non-succeeded statuses safely
- [ ] Storage keys contain only non-secret data
- [ ] Key rotation test passes without frontend rebuild

## Critical Gotchas

- `invoke()` is job-style and not suitable for ultra-high-frequency streaming request fan-out.
- For tiles/streaming paths, use Lambda for bootstrap/metadata only; avoid per-request proxying via `invoke()`.
- Do not assume `result` schema is universal; it is event-defined.
- `Authkey` is for admin/service operations (`/env`, `/script`, `/jobs`) and must never be shipped in client code.
- Keep event names explicit and versioned (`places_search_v1`) to avoid silent contract drift.

## References

- Play Lambda Service usage docs (internal docs provided by integrator)
- VIVERSE Storage SDK docs: https://docs.viverse.com/developer-tools/storage-sdk
