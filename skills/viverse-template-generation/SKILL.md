---
name: viverse-template-generation
description: Build, certify, and evolve file-backed VIVERSE templates with immutable/editable contracts and runtime-safe generation rules.
prerequisites: [template-registry, contract-schema, orchestrator-enforcement]
tags: [templates, architecture, orchestration, compliance, battletanks]
---

# VIVERSE Template Generation Skill

Use this skill when implementing or evolving the internal template system (registry, contracts, enforcement, certification) and when onboarding a new game template.

## Primary Objectives

1. Keep template runs deterministic and contract-driven.
2. Prevent regressions in existing working runtime paths (auth, matchmaking, local controls).
3. Separate immutable engine/core from editable gameplay/adapters.
4. Require evidence-backed completion for runtime-verification runs.

## Mandatory Workflow

1. Load template metadata from `templates/registry.json`.
2. Load contract from `<template>/template.json` and `<template>/TEMPLATE.md`.
3. Enforce write boundaries: block immutable writes, allow editable writes.
4. Validate scenario/ruleset compatibility before generation.
5. Run static/build/runtime gates before promoting template changes.
6. Emit explicit run-report events for template selection and gate outcomes.

## Distilled Lessons from battletanks-v1

1. **Do not gate local tank spawn on actor resolution only**.
   Local gameplay must remain available even if matchmaking actor binding is delayed.
2. **Iframe keyboard capture must be explicit**.
   Capture WASD/Arrow/Space with `preventDefault` and focus acquisition on pointer interaction.
3. **Template shells must stay playable on short viewports**.
   Do not lock the root page with `overflow: hidden` or fixed `h-screen` containers if gameplay can extend below the fold. Prefer `min-h-screen` plus vertical scrolling so bottom-row cards, controls, and dialogs remain reachable.
3. **Auth profile chain must not stop at generic placeholders**.
   If `VIVERSE Player/Explorer` appears, continue to `getUserInfo/getUser/getProfileByToken/API`.
4. **Never let bug-fix loops overwrite a correct `.env` App ID**.
   Preserve valid `VITE_VIVERSE_CLIENT_ID` across iterative fixes.
5. **After first app creation, lock App ID for the run/workspace**.
   Treat `.env` `VITE_VIVERSE_CLIENT_ID` as immutable for rebuilds and republishes unless user explicitly requests app migration.
6. **Separate first publish and republish logic**.
   First publish is allowed to create/extract App ID then write `.env`; republish must only reuse the existing `.env` App ID.
7. **Secondary HUD panels should not permanently cover gameplay**.
   Leaderboards, diagnostics, and similar overlays should default to a compact launcher or collapsed state when they would otherwise occupy active play space on small screens.
8. **Preview shell pass is not runtime pass**.
   Runtime-verification completion requires browser/probe evidence.

## Checklist

- [ ] Registry entry exists and points to real template path.
- [ ] Contract includes immutablePaths/editablePaths/injectionHooks/requiredGates.
- [ ] Scenario schema validates ruleset and mode params.
- [ ] Enforcement blocks immutable writes.
- [ ] Certification gates are run and archived.
- [ ] Core gameplay remains reachable on short/mobile-height viewports.
- [ ] Secondary overlay panels do not permanently obscure the active play area.
- [ ] Run report contains template events.

## Output Requirements

When using this skill, output:
- exact files created/updated
- gate results (pass/fail + reason)
- any blocked writes with violating path and rule
- next migration step (if partial rollout)
