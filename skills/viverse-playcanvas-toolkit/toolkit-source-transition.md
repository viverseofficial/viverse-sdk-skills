# Toolkit Source Transition

This repo now carries a repo-local Toolkit source manifest at [toolkit-source-manifest.json](toolkit-source-manifest.json).

The purpose of the manifest is to separate two decisions that were previously mixed together:

1. which Toolkit artifacts a consumer scene needs
2. where those artifacts come from during the transition from private local development to public distribution

## Current Goal

During the transition period, the engine-only world scaffolder should not hardcode one absolute external path forever.

Instead, it should:

1. resolve one named Toolkit source profile
2. write that choice into the generated consumer scene as a lock file
3. keep the base scene scaffold working even before real Toolkit imports are added

## Supported Source Profiles

The manifest currently models four source types:

1. `local-private-repo`
2. `vendored-artifacts`
3. `public-registry`
4. `public-cdn-hybrid`

### local-private-repo

Use this while the upstream Toolkit repo is still private and developers still build tarballs locally.

Pros:

1. matches the current real development flow
2. no extra publish infrastructure is required yet

Cons:

1. depends on a repo outside this workspace
2. not suitable as the long-term default

### vendored-artifacts

Use this when the skills repo must stay self-contained during the transition.

Pros:

1. removes the external local-folder dependency
2. keeps workflows reproducible offline

Cons:

1. repo size grows
2. artifact refresh must be managed deliberately

### public-registry

Use this when Toolkit packages are published remotely but runtime assets still do not need CDN treatment.

Pros:

1. standard package-management flow
2. cleaner consumer dependencies

Cons:

1. requires remote registry governance
2. still does not solve remote runtime assets by itself

### public-cdn-hybrid

Use this when packages come from a registry and Toolkit runtime assets come from a CDN.

Pros:

1. closest to a public production-ready distribution model
2. clean separation between JS modules and runtime asset hosting

Cons:

1. requires the most infrastructure coordination
2. cache and versioning rules must be explicit

## Recommended Transition Order

1. keep `vendored-artifacts` as the active default so this repo can run without any external local Toolkit path
2. use `local-private-repo` only as a developer override while upstream is still private and local package refresh is needed
3. switch to `public-registry` once remote package publishing is stable
4. move to `public-cdn-hybrid` when remote runtime asset hosting is ready

## Current Default

The current default profile is `vendored-artifacts`.

That means a freshly scaffolded engine-only project should now lock to Toolkit tarballs stored inside this repo under `vendor/toolkit/0.1.13/` instead of depending on an external local Toolkit folder.

## Consumer Scene Contract

The engine-only scaffold now writes `toolkit-source.lock.json` into the generated project.

That lock file records:

1. the manifest path used at generation time
2. the selected Toolkit source profile
3. the resolved package specifiers for that profile

The engine-only scaffold also injects those resolved package specifiers into the generated `package.json` so a fresh consumer scene can install the matching Toolkit packages immediately.

Future Toolkit-aware feature installers should read that lock file first instead of guessing where Toolkit artifacts live.