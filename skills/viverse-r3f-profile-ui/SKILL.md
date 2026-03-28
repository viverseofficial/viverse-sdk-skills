---
name: viverse-r3f-profile-ui
description: Show VIVERSE user profile in React Three Fiber scenes using @react-three/viverse hooks. Use for player tag UI, avatar icon rendering, and profile-safe fallbacks.
prerequisites: [@react-three/viverse, authenticated user session]
tags: [viverse, r3f, profile, avatar, ui]
---

# VIVERSE R3F Profile UI

Profile and player-tag UX patterns for `@react-three/viverse` scenes.

## When To Use This Skill

Use when you need:
- in-world player name tags
- avatar thumbnail UI above character
- safe fallback behavior when profile fields are missing

## Read Order

1. This file
2. [Access avatar/profile tutorial](https://pmndrs.github.io/viverse/tutorials/access-avatar-and-profile)
3. `../viverse-auth/SKILL.md`

## Preflight Checklist

- [ ] Auth flow works and user session is available
- [ ] `useViverseProfile()` is accessible in R3F scene tree
- [ ] You have fallback name/avatar values for guest/missing profile

## Implementation Workflow

1. Read profile with `useViverseProfile()`.
2. Render fallback profile if hook returns null.
3. Attach player tag to character node/group.
4. Billboard the tag to camera each frame.
5. Avoid exposing full raw account IDs in visible UI labels.

Example profile pattern:

```tsx
const profile = useViverseProfile() ?? {
  name: "Anonymous",
  activeAvatar: { headIconUrl: "https://picsum.photos/200" },
};
```

## Verification Checklist

- [ ] Profile name appears when authenticated
- [ ] Avatar icon appears when `headIconUrl` exists
- [ ] Fallback name/avatar appears without crash on missing profile
- [ ] Tag remains readable from camera angles

## Critical Gotchas

- `checkAuth()` token data is not equal to profile data; use profile hook/API.
- Keep fallback names generic; avoid printing full UUID/account identifiers.
- If UI flickers, ensure camera-facing quaternion update is in frame loop.

## References

- [Access avatar and profile tutorial](https://pmndrs.github.io/viverse/tutorials/access-avatar-and-profile)
- [pmndrs/viverse repository](https://github.com/pmndrs/viverse)
