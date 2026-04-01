# VIVERSE Agent Skills

Skills are structured knowledge modules that package SDK integration patterns into AI-consumable documents. They can be used by any LLM-powered assistant (Gemini, Claude, ChatGPT, Copilot, etc.) to help developers integrate VIVERSE features into their projects.

## How Skills Work

Each skill folder contains:
- **SKILL.md** — Main instructions: when to use, prerequisites, step-by-step guide
- **patterns/** — Reusable code patterns with explanations of *why*, not just *what*
- **examples/** — Reference implementations and usage patterns

## Using a Skill

### With an AI assistant
Ask your AI to read the skill before starting work:
```
Read the skill at skills/playcanvas-avatar-navigation/SKILL.md 
and add walkable navigation to my PlayCanvas scene.
```

### With the VIVERSE Agent
The agent auto-loads SKILL.md summaries on startup. When it detects a task matching a skill's domain, it loads the relevant patterns.

## Available Skills

| Skill | Description |
|-------|-------------|
| [playcanvas-avatar-navigation](./playcanvas-avatar-navigation/) | Physics-based avatar movement in PlayCanvas + Ammo.js scenes |
| [viverse-auth](./viverse-auth/) | VIVERSE Login SDK integration (SSO, user profiles) |
| [viverse-avatar-sdk](./viverse-avatar-sdk/) | Loading VIVERSE user avatars (GLB/VRM) into 3D scenes |
| [viverse-r3f-foundation](./viverse-r3f-foundation/) | R3F + @react-three/viverse mini-game foundation for browser projects |
| [viverse-r3f-profile-ui](./viverse-r3f-profile-ui/) | Profile/player-tag UI patterns using `useViverseProfile()` |
| [viverse-threejs-vanilla-foundation](./viverse-threejs-vanilla-foundation/) | Vanilla Three.js + VIVERSE integration foundation without React |
| [viverse-leaderboard](./viverse-leaderboard/) | Global leaderboards via VIVERSE gameDashboard SDK |
| [viverse-multiplayer](./viverse-multiplayer/) | Matchmaking & Play SDK — rooms, create/join, custom state sync |
| [viverse-template-generation](./viverse-template-generation/) | File-backed template registry, contract enforcement, and certification workflow |
| [viverse-key-protection-lambda](./viverse-key-protection-lambda/) | Protect API keys with Play Lambda env/script/invoke boundaries, plus manual-approval CI sync flow |
| [viverse-world-publishing](./viverse-world-publishing/) | Publishing PlayCanvas projects to VIVERSE Worlds |
| [vrma-animation-retargeting](./vrma-animation-retargeting/) | VRMA animation retargeting for VIVERSE avatars |
| [viverse-ps-cli](./viverse-ps-cli/) | Upload and replace 3D model assets (.zip/.glb/.obj) to VIVERSE via ps-cli |

## Creating a New Skill

1. Create a folder under `skills/` with a kebab-case name
2. Add a `SKILL.md` with YAML frontmatter:
```yaml
---
name: my-new-skill
description: One-line summary of what this skill enables
prerequisites: [list, of, requirements]
tags: [playcanvas, physics, networking]
---
```
3. Add patterns and examples as needed
4. Document **gotchas and edge cases** — these are the most valuable part
5. Update this README's skill table
