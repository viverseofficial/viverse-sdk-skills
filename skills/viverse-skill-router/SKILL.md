---
name: viverse-skill-router
description: "Route VIVERSE feature requests to the correct skill set based on project type. Use when the user asks about multiplayer, leaderboard, publishing, or other features that exist in both general and PlayCanvas Toolkit variants."
user-invocable: false
---

# VIVERSE Skill Router

## What This Skill Does

This skill resolves ambiguity when a user request could match both a general VIVERSE skill and a PlayCanvas Toolkit-specific skill.

It does not perform the work itself — it identifies the correct downstream skill and hands off.

## When This Router Activates

Use this router when the user's request matches a keyword that exists in both skill sets:

- "leaderboard" → general `viverse-leaderboard` OR toolkit `viverse-playcanvas-leaderboard`
- "multiplayer" → general `viverse-multiplayer` OR toolkit `viverse-default-room-multiplayer`
- "publish" → general `viverse-world-publishing` OR toolkit `viverse-cli-publish`

## Detection Rules

Check the user's workspace and context for these signals to determine project type:

| Signal Present | Route To |
|----------------|----------|
| `packages/network/`, `toolkit-capability-catalog.json`, or `viverse-playcanvas-toolkit` in dependencies | PlayCanvas Toolkit skills |
| `skills/viverse-playcanvas-toolkit/` exists in workspace | PlayCanvas Toolkit skills |
| User explicitly says "PlayCanvas Toolkit", "engine-only world", or "local world" | PlayCanvas Toolkit skills |
| Raw `<script src="viverse-sdk">` tags, no toolkit packages | General skills |
| Three.js, React Three Fiber, or vanilla JS project | General skills |
| User says "matchmaking", "named rooms", "host-authoritative", "custom state sync" | General `viverse-multiplayer` (toolkit doesn't cover this) |
| No clear project type detected | Ask user (see below) |

## Conflict Resolution

When both a root skill and a toolkit skill could match:

1. Check project type using the signals above.
2. If PlayCanvas Toolkit project → route to the toolkit-specific skill.
3. If general VIVERSE project → route to the root-level skill.
4. If unknown → ask the user: "Are you using the PlayCanvas Toolkit for a local world, or building with the general VIVERSE SDK?"

## Routing Table

### Leaderboard

| Context | Skill | Path |
|---------|-------|------|
| General VIVERSE project (any framework) | `viverse-leaderboard` | `skills/viverse-leaderboard/SKILL.md` |
| PlayCanvas Toolkit local world | `viverse-playcanvas-leaderboard` | `skills/viverse-playcanvas-toolkit/skills/viverse-playcanvas-leaderboard/SKILL.md` |

### Multiplayer

| Context | Skill | Path |
|---------|-------|------|
| Full matchmaking, named rooms, host-authoritative, custom sync | `viverse-multiplayer` | `skills/viverse-multiplayer/SKILL.md` |
| Default-room shared presence only (PlayCanvas Toolkit) | `viverse-default-room-multiplayer` | `skills/viverse-playcanvas-toolkit/skills/viverse-default-room-multiplayer/SKILL.md` |

### Publishing

| Context | Skill | Path |
|---------|-------|------|
| General VIVERSE world publishing | `viverse-world-publishing` | `skills/viverse-world-publishing/SKILL.md` |
| PlayCanvas Toolkit local build → VIVERSE CLI | `viverse-cli-publish` | `skills/viverse-playcanvas-toolkit/skills/viverse-cli-publish/SKILL.md` |

## Rules

1. Never invoke both a general and toolkit skill for the same request.
2. If the user's request clearly exceeds toolkit boundaries (matchmaking, multi-board, custom backend), always route to the general skill even if the project uses the toolkit.
3. If the toolkit skill explicitly says the request is out of scope, fall back to the general skill.
4. Do not stay in this router longer than one routing decision. Hand off immediately.
