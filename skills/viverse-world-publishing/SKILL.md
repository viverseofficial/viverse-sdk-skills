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

## Mandatory Compliance Gates (MUST PASS)

These are release blockers for any publishing task:

1. **MUST** maintain a single App ID authority per run (the target App ID) and keep it consistent across:
   - `.env` (`VITE_VIVERSE_CLIENT_ID`)
   - source/config fallback path
   - built `dist/` assets
2. **MUST** verify App ID propagation after every build:
   - Run one deterministic check that the expected App ID appears in `dist/`.
   - If the check fails, fix root cause (`.env`, source wiring, stale build) before any retry.
3. **MUST NOT** perform repeated equivalent grep checks without state change.
   - Retrying the same command with unchanged files/build output is invalid.
4. **MUST** perform a fresh build before `viverse-cli app publish` if `.env` or App ID-related source changed.
5. **MUST** lock App ID after first app creation in a workspace/run:
   - Immediately write `.env` with `VITE_VIVERSE_CLIENT_ID=<created_app_id>`.
   - After this point, treat `VITE_VIVERSE_CLIENT_ID` as immutable for all fix/rebuild/republish steps.
   - Republish reuses the same App ID; never rotate App ID unless user explicitly requests migration to a different app.

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
- [ ] Studio review/submission step completed if required

## Gotchas

- `import.meta.env` is build-time in Vite; rebuild after env changes.
- Publishing to app A with build configured for app B can break auth and leaderboard.
- Hardcoded runtime fallback App IDs are release blockers. Runtime must read `VITE_VIVERSE_CLIENT_ID` from env wiring.
- Asset paths must be deployment-safe (relative/public).
- Review state in Studio may block full live rollout after upload.
- After publish, browser/app cache can still run old bundle hash; hard refresh or add temporary build-tag log for verification during hotfix debugging.

## References

- [VIVERSE Studio](https://studio.viverse.com/)
- [examples/publish-workflow.md](examples/publish-workflow.md)
