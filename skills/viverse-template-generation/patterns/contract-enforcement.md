# Contract Enforcement Pattern

## Goal

Apply template contracts at write-time to warn about high-risk core-engine files and enforce editable path boundaries.

## Evaluate Write

Input:
- workspacePath
- absolutePath
- contract.immutablePaths[] (high-risk, advisory)
- contract.editablePaths[]

Rules:
1. Reject writes outside workspace.
2. Warn (advisory) on writes matching high-risk paths — allow the write but log for observability.
3. If editable paths are defined, reject writes outside editable set.

## Violation Event

Emit:
- `template_contract_violation`
- `templateId`
- `path`
- `reason` (`immutable_path_violation` — advisory/non-blocking, `editable_path_violation` — blocking)
