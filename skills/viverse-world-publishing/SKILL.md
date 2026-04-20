---
name: viverse-world-publishing
description: Publishing PlayCanvas projects to VIVERSE Worlds via CLI
prerequisites: [Node.js, VIVERSE Studio account, VIVERSE CLI]
tags: [viverse, publishing, cli, deployment]
---

# VIVERSE World Publishing

Publish a web build to VIVERSE Worlds with repeatable CLI workflow.

## When To Use This Skill

Use this when a project needs:
- Deployment to the VIVERSE Worlds platform
- A public URL for sharing immersive 3D experiences
- Integration with the VIVERSE ecosystem (discovery, multiplayer)

## Read Order

1. This file
2. [examples/publish-workflow.md](examples/publish-workflow.md)

## Core Rules

1. Keep one App ID authority per run:
   - `.env`
   - approved source/runtime fallback path
   - built `dist/`
2. After first app creation, write `.env` and treat that App ID as locked for the workspace.
3. Rebuild after any App ID-related env or source change.
4. Do not hardcode the authoritative App ID as a literal in editable source as a publish workaround.
5. Verify `dist/` deterministically before publish or verifier rerun:
   - expected App ID must appear
   - `YOUR_APP_ID` must not appear
6. If publish succeeded and only verifier is blocked, recover locally and rerun verification only.

## Deterministic App ID Propagation Workflow

Use this whenever publish/auth/leaderboard issues might be caused by App ID drift.

### App ID authority order

1. `.env` `VITE_VIVERSE_CLIENT_ID`
2. approved runtime config path already allowed by the project/template contract
3. hostname-derived world App ID fallback, only for Worlds iframe runtime

### Verification sequence

1. Read `.env` and confirm `VITE_VIVERSE_CLIENT_ID=<expected_app_id>`.
2. Inspect source/config fallback path and confirm it resolves from env/runtime authority rather than a hardcoded literal.
3. Rebuild after any env or App ID-related source change.
4. Run one deterministic grep check on `dist/`:
   - expected App ID must appear
   - `YOUR_APP_ID` must not appear
5. Only after those pass, publish or rerun verifier.

### Failure interpretation

- `dist/ contains YOUR_APP_ID`
  Root cause is unresolved placeholder or stale build. Fix source/env, then rebuild.
- `source contains hardcoded app id literal`
  Root cause is invalid source workaround. Remove literal, restore env/runtime resolution, then rebuild.
- `publish succeeded but verifier failed on App ID propagation`
  Treat this as a deterministic recovery task, not a full workflow restart.

## Verifier Recovery Path

1. Read the exact verifier reason.
2. Patch only the concrete propagation defect.
3. Rebuild once.
4. Re-run deterministic verification only.
5. Publish again only if the fix changed the actual shipped bundle and the published target still needs updating.

## CLI Workflow

### 1) Install CLI (if needed)

```bash
npm install -g @viverse/cli
```

### 2) Login

```bash
viverse-cli auth login
```

### 3) Build

```bash
npm run build
```

### 4) Verify app list and status

```bash
viverse-cli app list
```

### 5) Publish to existing app

```bash
viverse-cli app publish ./dist --app-id <APP_ID>
```

### 5A) First publish vs republish policy

- First publish (new app):
  1. `viverse-cli app create --name "<APP_NAME>"`
  2. Extract App ID from stdout.
  3. Write `.env` with `VITE_VIVERSE_CLIENT_ID=<APP_ID>`.
  4. Build and publish with the same App ID.
- Republish (existing app):
  1. Read App ID from `.env`.
  2. Build and publish with that same App ID.
  3. Do not rewrite `.env` App ID.

### 6) (Optional) Auto-create app + publish

> [!IMPORTANT]
> When creating an app for the web/iframe (VIVERSE Worlds), you **MUST** use `--type world`. The default is `mobile`, which will cause `checkAuth()` to fail.

```bash
viverse-cli app publish ./dist --auto-create-app --name "<APP_NAME>" --type world
```

## Release Checklist

- [ ] CLI publish returns success URL
- [ ] Preview URL opens and assets load
- [ ] Runtime console confirms latest bundle hash/build tag (avoid stale cached build confusion)
- [ ] Auth flow works in the published target app
- [ ] `.env` App ID matches the published target app
- [ ] Source contains no hardcoded App ID workaround literals
- [ ] `dist/` contains expected App ID and does not contain `YOUR_APP_ID`
- [ ] Studio review/submission step completed if required

## Gotchas

- `import.meta.env` is build-time in Vite; rebuild after env changes.
- Publishing to app A with build configured for app B can break auth and leaderboard.
- Hardcoded runtime fallback App IDs are release blockers. Runtime must read `VITE_VIVERSE_CLIENT_ID` from env wiring.
- Built `dist/` containing the real target App ID is expected after env injection; the release blocker is unresolved placeholder or invalid source hardcoding.
- Asset paths must be deployment-safe (relative/public).
- Review state in Studio may block full live rollout after upload.
- After publish, browser/app cache can still run old bundle hash; hard refresh or add temporary build-tag log for verification during hotfix debugging.

## References

- [VIVERSE Studio](https://studio.viverse.com/)
- [examples/publish-workflow.md](examples/publish-workflow.md)
