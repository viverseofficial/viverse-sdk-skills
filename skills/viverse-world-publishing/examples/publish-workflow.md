# Publish Workflow

Step-by-step checklist for publishing a project to VIVERSE Worlds.

## Pre-Publish Checklist

- [ ] VIVERSE Studio account created
- [ ] World App created in Studio (have the App ID)
- [ ] VIVERSE CLI installed (`npm install -g @viverse/cli`)
- [ ] CLI authenticated (`viverse-cli auth login`)
- [ ] VIVERSE SDK script tag in `index.html`
- [ ] App ID configured in code or `.env`
- [ ] Redirect URI registered in VIVERSE Studio (for auth callback)

## Build & Publish

```bash
# 1. Build the production bundle
npm run build

# 2. Verify the build output
ls dist/   # Should contain index.html and assets

# 3. Publish to VIVERSE
# If you don't know the App ID, run: viverse-cli app list
viverse-cli app publish ./dist --app-id YOUR_APP_ID

# 4. Note the returned URL
# https://worlds.viverse.com/[hub_sid]
```

## Post-Publish Verification

1. Open the published URL in a browser
2. Verify the 3D scene loads correctly
3. Test VIVERSE login (should redirect and return)
4. Check avatar loading (if applicable)
5. Test multiplayer (if applicable) by opening in two tabs

## Updating a Published World

Simply rebuild and republish:

```bash
npm run build
viverse publish ./dist
```

The same World URL is updated in-place.
