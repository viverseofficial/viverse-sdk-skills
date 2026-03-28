---
name: viverse-threejs-vanilla-foundation
description: Build VIVERSE-enabled browser games in vanilla Three.js using @pmndrs/viverse and @viverse/sdk. Use when you want Three.js without React.
prerequisites: [three, @pmndrs/viverse, @viverse/sdk, VITE VIVERSE app id]
tags: [viverse, threejs, vanilla, browser-game, foundation]
---

# VIVERSE Three.js Vanilla Foundation

Use `@pmndrs/viverse` for non-React Three.js game foundations with VIVERSE integration.

## When To Use This Skill

Use when you need:
- vanilla Three.js architecture (no React dependency)
- VIVERSE auth/profile integration in a custom render loop
- lightweight browser mini-game foundation

## Read Order

1. This file
2. [Without React intro](https://pmndrs.github.io/viverse/without-react/introduction)
3. `../viverse-auth/SKILL.md`
4. `../viverse-world-publishing/SKILL.md`

## Preflight Checklist

- [ ] Install deps: `three`, `@pmndrs/viverse`, `@viverse/sdk`, `vite`
- [ ] Prepare production App ID env (`VITE_VIVERSE_APP_ID` or mapped equivalent)
- [ ] Confirm render loop + resize lifecycle is implemented
- [ ] Confirm asset loading fallbacks exist

## Implementation Workflow

1. Create scene/camera/renderer/canvas and resize handling.
2. Add environment (sky/lights/map).
3. Create physics world and character via `@pmndrs/viverse`.
4. Initialize VIVERSE client and auth/profile fetch via `@viverse/sdk`.
5. Bind profile avatar/model to character (fallback if missing).
6. Implement stable update loop (movement, UI updates, respawn).

## Verification Checklist

- [ ] Scene renders and updates on browser resize
- [ ] Character control updates every frame
- [ ] Auth/profile fetch succeeds in published environment
- [ ] Game still runs when profile/avatar is unavailable

## Critical Gotchas

- Keep App ID in production env and rebuild before publish.
- Avoid blocking render startup on slow network profile calls.
- Guard async auth/profile requests against unmount/dispose races.
- Keep mobile/browser performance constraints in scope (mini-game assets).

## References

- [Without React introduction](https://pmndrs.github.io/viverse/without-react/introduction)
- [pmndrs/viverse repository](https://github.com/pmndrs/viverse)
