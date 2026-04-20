---
name: viverse-template-generation
description: Build, certify, and evolve file-backed VIVERSE templates with immutable/editable contracts and runtime-safe generation rules.
prerequisites: [template-registry, contract-schema, orchestrator-enforcement]
tags: [templates, architecture, orchestration, compliance, battletanks]
---

# VIVERSE Template Generation Skill

Use this skill when implementing or evolving the internal template system (registry, contracts, enforcement, certification) and when onboarding a new game template.

## Core Rules

1. Load registry entry, `template.json`, and `TEMPLATE.md` before generation.
2. Enforce immutable vs editable paths strictly.
3. Validate scenario/ruleset compatibility before workspace creation.
4. Run static/build/runtime gates before promoting template changes.
5. Record explicit run-report events for template selection, blocked writes, and gate outcomes.

## High-Signal Lessons

1. Do not replace game bootstrap with an auth-only shell. Startup must still launch the world/game loop.
2. Gameplay/UI changes must not rewrite protected bootstrap/runtime files unless a verified blocker proves it is necessary.
3. Template shells must remain playable on short viewports; avoid fixed full-screen layouts that hide gameplay/UI below the fold.
4. Auth/profile recovery must continue past generic placeholders.
5. Once an App ID is created and written to `.env`, treat it as locked for the workspace.
6. Separate first-publish logic from republish logic.
7. Overlay panels must not permanently cover active gameplay.
8. Preview-shell success is not runtime certification; require browser/probe evidence.

## Template Checklist

- [ ] Registry entry exists and template path is real
- [ ] Contract includes `immutablePaths`, `editablePaths`, `injectionHooks`, `requiredGates`
- [ ] `scenario.schema.json` exists and matches template/rulesets
- [ ] `rulesets/` exists; if schema references `default`, `rulesets/default.json` exists
- [ ] Enforcement blocks immutable writes
- [ ] Startup/bootstrap still launches the world after auth/bootstrap
- [ ] Gameplay remains usable on short/mobile-height viewports
- [ ] Secondary overlays do not obscure active play
- [ ] Run report contains template events and blocked-write reasons

## Output Requirements

When using this skill, output:
- exact files created/updated
- gate results (pass/fail + reason)
- any blocked writes with violating path and rule
- next migration step (if partial rollout)
