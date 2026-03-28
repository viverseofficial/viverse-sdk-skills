# Voxel Landmark Migration (Reference)

## Objective

- Keep Places search secret in Lambda.
- Keep tiles streaming performant.
- Add automation for `/env` + `/script` sync with manual approval.

## Event Set

1. `places_search_event`
2. `tiles_root_bootstrap_event` (optional bootstrap; not per-tile proxy)

## Env Set

- `GOOGLE_PLACES_API_KEY` (required)
- `GOOGLE_PLACES_TEXT_SEARCH_URL` (optional)
- `GOOGLE_TILES_API_KEY` (required if tiles bootstrap enabled)
- `GOOGLE_TILES_ROOT_URL` (optional, default `https://tile.googleapis.com/v1/3dtiles/root.json`)

## CI Flow

1. Plan: read current `/env` + `/script`, compute drift artifacts.
2. Human approval: review redacted diff.
3. Apply: upsert changed env/script only.
4. Verify + Test: assert env/script via API, compare script hashes, check jobs API health.

### Recommended commands

1. `bash ./scripts/sync-lambda-config.sh`
2. `bash ./scripts/sync-lambda-config.sh --verify --test`
3. `bash ./scripts/sync-lambda-config.sh --approve --verify --test`

### Guardrails from production incidents

- Always set `LAMBDA_GAME_ID` (or pass `--game-id`) to avoid accidental placeholder scope.
- Abort if game id is `YOUR_APP_ID`; do not apply.
- Keep `LAMBDA_AUTHKEY` only in local env and CI secrets, never in repo.

## Important Tradeoff

`invoke()` is job-style. Use it for bootstrap and business APIs, not high-frequency tile proxying.
