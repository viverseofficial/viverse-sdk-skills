# Storage Boundary Pattern

VIVERSE Storage is for non-secret user-scoped data. Do not place credentials there.

## Allowed

- User preferences
- Search history and cache keys
- Non-sensitive UI state
- Hashes/metadata that cannot be used as credentials

## Forbidden

- API keys
- Service account JSON
- Upstream bearer tokens
- Admin `Authkey`

## Enforcement

1. Keep secrets only in Play Lambda `/env`.
2. Keep admin credentials only in CI secret manager/local secure env file.
3. Add static scans for `VITE_*KEY`, `TOKEN`, `SECRET` leaks.
4. Redact secret-like keys in generated artifacts.

