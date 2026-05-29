# Non-Technical UX Config Guide

This note explains how to maintain `scripts/nontechnical-user-ux.config.json`.

Keep it short, predictable, and review-friendly.

## Rule ID Naming

Use stable, plain IDs so findings are easy to read in review output.

Preferred shape:

- `runtime-boundary`
- `runtime-entry`
- `choose-technical-route`
- `taxonomy-template`

Guidelines:

- use lowercase kebab-case
- name the user-facing problem, not the implementation detail
- keep one rule focused on one wording or decision leak
- prefer updating an existing rule over adding near-duplicates

## When To Add A Rule

Add a new rule when:

- the same jargon leak appears in more than one place
- a helper or skill starts asking users to make a technical choice they should not make
- a wording pattern is clearly confusing for non-technical users

Do not add a rule just because one file has one acceptable technical phrase in a narrow command or debugging context.

## When To Use `skipLinePatterns`

Use `skipLinePatterns` when the wording is a known maintainer-only meta pattern, for example:

- style-guide wording such as `say "..." instead of "..."`
- checklist phrasing that explains what reviewers should look for
- repeated meta guidance that should never become a finding anywhere

Do not use `skipLinePatterns` to silence a real user-facing problem in one specific file.

## When To Use `allowRuleIdsByFilePattern`

Use `allowRuleIdsByFilePattern` only when all of these are true:

1. the file really does need the wording
2. the wording is limited to one or a few files
3. skipping the whole line pattern would hide too much
4. changing the user-facing wording would make the output less correct

Good use cases:

- a validator or helper must print one exact technical term for a precise failure
- one file must keep a narrow implementation name for compatibility or debugging

Bad use cases:

- silencing a rule because the wording is inconvenient to rewrite
- suppressing broad categories of findings across many files
- compensating for a vague or overly aggressive rule that should be refined instead

## Review Order

When a finding appears, use this order:

1. rewrite the user-facing wording if possible
2. narrow the rule if it is clearly overbroad
3. add a file-specific allowlist only if the wording is intentionally required
4. add a broad skip pattern only for maintainer-only meta text

## Minimal Maintenance Rule

Prefer the smallest config change that keeps the check useful.

If a new allowlist entry feels permanent and broad, that usually means the rule needs refinement instead.
