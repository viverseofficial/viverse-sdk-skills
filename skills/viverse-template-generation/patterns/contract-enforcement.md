# Contract Enforcement Pattern

## Goal

Apply template contracts at write-time to prevent accidental core-engine mutation.

## Evaluate Write

Input:
- workspacePath
- absolutePath
- contract.immutablePaths[]
- contract.editablePaths[]

Rules:
1. Reject writes outside workspace.
2. Reject writes matching immutable paths.
3. If editable paths are defined, reject writes outside editable set.

## Violation Event

Emit:
- `template_contract_violation`
- `templateId`
- `path`
- `reason` (`immutable_path_violation`, `editable_path_violation`)
