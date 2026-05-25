# VIVERSE Non-Technical User UX Checklist

Use this checklist before merging a new or materially changed user-facing skill, prompt, or helper message.

The goal is simple:

- non-technical users should not have to make internal tooling decisions
- non-technical users should not have to learn repo vocabulary just to continue
- the agent should own technical routing whenever the repo can infer it safely

## Core Rule

If the user can continue by giving a folder path, a world goal, an app choice, or another business detail, do not ask them to choose the technical path.

That means the agent should usually decide things like:

- which helper or script to use
- which world file to edit
- which local preview path to run
- which upload folder is the right one
- which built-in shortcut or wrapper is the safest default

## Quick Pass Questions

A user-facing workflow should pass all of these questions.

1. Does the opening describe the user's goal in plain language instead of repo structure?
2. Does the workflow avoid asking the user to choose between technical routes the agent can infer?
3. Does the workflow ask only for missing business or project facts, not implementation style?
4. Does the workflow keep internal file names, helper names, and profile names out of the first explanation unless they are required for the next action?
5. Does the workflow present one safest next step instead of a menu of equivalent technical options?
6. If the workflow mentions a technical term, does it explain that term immediately in plain language?
7. If the workflow needs a file or folder, does it ask for the path directly instead of asking the user to classify it?
8. If the workflow needs a world file, does it infer it first before asking the user to name it?
9. If the workflow needs setup, does it prefer doing the setup for the user when the values are already known?
10. If the workflow fails, does it explain the blocker in user terms before exposing repo internals?

If any answer is no, revise the workflow before treating it as acceptable.

## Do Not Ask The User To Decide

Do not push these choices onto a non-technical user when the repo can decide them safely:

- profile, manifest, lock, bundle, artifact, or wrapper choices
- preview method or local URL choice
- publish-folder category choice
- runtime entry or main world file choice when it can be inferred
- install strategy when one safe default is already clear
- helper script versus raw command choice when the helper is the default
- sync shortcut versus low-level command choice when the shortcut exists

## Preferred User Inputs

Prefer asking for:

- project folder path
- what the world should do
- whether this should go to an existing world/app or a new one
- app ID or leaderboard Meta Name when the workflow truly requires it
- one or two candidate folder paths when publishability is uncertain

Avoid asking first for:

- profile names
- manifest paths
- lock files
- runtime entry names
- branch mechanics unless the workflow cannot continue without them
- command variants or install modes

## Preferred Wording

Prefer wording like:

- your folder
- your world
- your project folder
- finished folder
- automatic sync
- local sync shortcut
- main world file
- built-in leaderboard wiring
- local avatar starter

Avoid leading with wording like:

- runtime bootstrap
- runtime boundary
- runtime entry
- integration route
- toolkit source profile
- lock file
- vendored artifacts
- wrapper internals
- build artifact classification

## Review Triggers

Re-check this checklist whenever a change introduces or expands:

- a new skill or slash prompt
- a new helper script with user-facing output
- a new validation message
- a new setup flow
- a new publish flow
- a new generated-project message

## Minimal Review Outcome

Use one of these review notes when checking a change.

### Pass

The change keeps technical routing with the agent and keeps the user-facing wording plain.

### Revise

The change still exposes internal repo concepts too early, asks the user to make an avoidable technical choice, or leads with terms a non-technical user would not understand.

## Related Documents

- [viverse-skill-acceptance-checklist.md](./viverse-skill-acceptance-checklist.md)
- [README.md](./README.md)
