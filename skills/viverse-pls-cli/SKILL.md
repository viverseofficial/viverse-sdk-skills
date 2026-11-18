---
name: viverse-pls-cli
description: Convert 3D models (.zip/.glb/.obj) to Polygon Streaming format on VIVERSE using pls-cli. Handles upload, replace, list, and delete operations. Use when the task involves converting models to Polygon Streaming, uploading assets, or managing assets on VIVERSE stage/prod environments.
---

# pls-cli — VIVERSE Polygon Streaming CLI

Operational guide for AI agents running pls-cli to manage 3D model assets on VIVERSE.

## Direct Invocation

When the user invokes this skill without naming an operation, respond in the user's language with this action menu, then ask which operation to perform:

- **Upload:** `upload <model.zip|model.glb|model.obj> [to <group-uuid>] [stage]`
- **Replace:** `replace <old-asset-id> with <model file> [stage]`
- **List:** `list assets [in <group-uuid>] [stage]`
- **Delete:** `delete <asset-id> [stage]`
- **Tags:** `create, list, or assign asset tags`

When the user names an operation, proceed with that operation rather than showing the menu.

## 0. Install pls-cli

### Check if already installed

```bash
which pls-cli || ls ~/bin/pls-cli 2>/dev/null || ls /usr/local/bin/pls-cli 2>/dev/null
```

If found, go to **Check for updates**. Otherwise, install it.

### Check for updates

Run this once per session, before the first pls-cli command:

```bash
INSTALLED=$(pls-cli version | awk '{print $2}')   # e.g. v1.2.0, or "dev" for a local build
LATEST=$(curl -fsSL -o /dev/null -w '%{url_effective}' \
  https://github.com/ViveportSoftware/pls-cli/releases/latest | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+$')
echo "installed=$INSTALLED latest=$LATEST"
```

Check these in order:

- `LATEST` is empty (offline or GitHub unreachable): say the check was skipped and continue.
- `INSTALLED` is `dev`: a local build. Don't offer an update — the user is building from source.
- `INSTALLED` equals `LATEST`: up to date, continue.
- Otherwise: tell the user both versions and ask before updating.
  On their OK, reinstall with the steps below, writing over the existing binary
  (`command -v pls-cli` shows where it is) instead of `~/bin/pls-cli`.

An installed `v1.x` cannot log in with the commands in Section 2 (`--password-stdin` and
`PLS_CLI_PASSWORD` need `v2.0.0` or later), so recommend the update strongly.

### Install from GitHub Releases (recommended)

Detect OS and architecture, then download the latest release binary:

```bash
OS=$(uname -s | tr '[:upper:]' '[:lower:]')   # darwin or linux
ARCH=$(uname -m)                               # x86_64 or arm64
VERSION=$(curl -fsSL -o /dev/null -w '%{url_effective}' \
  https://github.com/ViveportSoftware/pls-cli/releases/latest | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+$')

# Normalise arch name
case "$ARCH" in
  x86_64)  ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
esac

BINARY="pls-cli-${OS}-${ARCH}"
URL="https://github.com/ViveportSoftware/pls-cli/releases/download/${VERSION}/${BINARY}"

mkdir -p ~/bin
curl -fsSL "$URL" -o ~/bin/pls-cli
chmod +x ~/bin/pls-cli
```

> **Windows**: Download `pls-cli-windows-amd64.exe` from the releases page and add it to your PATH.

### Add ~/bin to PATH (if not already)

```bash
# Check if ~/bin is in PATH
echo $PATH | grep -q "$HOME/bin" || export PATH="$HOME/bin:$PATH"

# To persist, add to ~/.zshrc or ~/.bashrc:
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
```

### Verify installation

```bash
pls-cli version
```

---

## 1. Before Running Commands

### Credential safety rule

NEVER pass email or password as literal values in shell commands — they appear in logs.
Always read from env vars. Canonical names:

- `PLS_CLI_TEST_EMAIL`
- `PLS_CLI_TEST_PASSWORD`
- `PLS_CLI_TEST_GROUP_UUID` (optional; otherwise auto-select or pass `--group`)

Some repos store the same account as `VIVERSE_TEST_EMAIL` / `VIVERSE_TEST_PASSWORD` (for example e2e env files). Map those before login; do not print the values:

```bash
# Prefer PLS_CLI_* when set; otherwise accept VIVERSE_TEST_* aliases.
export PLS_CLI_TEST_EMAIL="${PLS_CLI_TEST_EMAIL:-$VIVERSE_TEST_EMAIL}"
export PLS_CLI_TEST_PASSWORD="${PLS_CLI_TEST_PASSWORD:-$VIVERSE_TEST_PASSWORD}"
```

If neither pair exists, ask the user to set the variables in their terminal before proceeding.

---

## 2. Authentication

The CLI uses cookie-based auth stored in `~/.pls-cli/credentials.json`.
There is **no token env var** — you must log in first with `pls-cli login`.

### Login (saves credentials to ~/.pls-cli/credentials.json)

Since `v2.0.0` there is no `--password` flag. Pass the password through the `PLS_CLI_PASSWORD`
env var (or pipe it with `--password-stdin`) so it never appears in the process arguments:

```bash
# Stage
PLS_CLI_PASSWORD="$PLS_CLI_TEST_PASSWORD" pls-cli login --stage \
  --email="$PLS_CLI_TEST_EMAIL"

# Production
PLS_CLI_PASSWORD="$PLS_CLI_TEST_PASSWORD" pls-cli login \
  --email="$PLS_CLI_TEST_EMAIL"
```

### Verify login succeeded

```bash
pls-cli status
# Outputs: email, account ID, environment (stage/prod), token expiry
```

### Environment mismatch — handled automatically

If you run `upload --stage` but logged in for prod (or vice versa), the CLI will **exit with an error before touching the API**:

```
error: credentials are for prod environment, but --stage flag was provided
Re-run: pls-cli login --stage
```

You do not need to manually check the environment — the CLI enforces it.

---

## 3. Upload

```bash
# Minimal — --group is OPTIONAL (CLI auto-selects your first group if omitted)
pls-cli upload model.zip

# With explicit group
pls-cli upload model.zip --group=<group-uuid>

# Stage environment
pls-cli upload model.zip --group=<group-uuid> --stage

# With conversion options
pls-cli upload model.glb \
  --group=<group-uuid> \
  --stage \
  --ai-enhance \
  --collider \
  --resolution=high \
  --collider-scale=5

# Multi-file (max 10 files)
pls-cli upload file1.zip file2.glb file3.obj --group=<group-uuid>

# Machine-readable output (for agent parsing — recommended)
pls-cli upload model.zip --json
```

### Upload flags reference

| Flag               | Values                          | Default       | Notes                                             |
| ------------------ | ------------------------------- | ------------- | ------------------------------------------------- |
| `--group`          | UUID                            | auto-selected | Omit to use your first group automatically        |
| `--stage`          | bool                            | false         | Use staging environment                           |
| `--ai-enhance`     | bool                            | false         | AI enhancement                                    |
| `--collider`       | bool                            | false         | Generate collision mesh                           |
| `--resolution`     | performance/balanced/high/ultra | balanced      | -                                                 |
| `--collider-scale` | 0.3/2/5/10/100                  | 2.0           | -                                                 |
| `--secure`         | bool                            | false         | Encryption                                        |
| `--json`           | bool                            | false         | Structured result is JSON, but **upload progress bars may still leak onto stdout**. Parse the trailing `{...}` object, do not `JSON.parse` the whole stream. Human messages also go to stderr. |
| `--tags`           | comma-separated names           | -             | Auto-create missing tags and assign after upload  |

---

## 4. Replace

```bash
# Replace existing asset by ID
pls-cli replace <old-asset-id> new-model.zip

# Stage
pls-cli replace <old-asset-id> new-model.glb --stage

# With collider + machine-readable output
pls-cli replace <old-asset-id> new-model.obj --collider --collider-scale=10 --json
```

Replace shares the same flags as upload except `--group` (originId is provided instead). This includes `--tags` — pass comma-separated tag names to auto-create and assign tags after conversion.

---

## 5. List Assets and Construct Playable URLs

```bash
# Human output auto-selects the first group if --group is omitted.
pls-cli list

# Machine-readable list requires an explicit group.
pls-cli list --group=<group-uuid> --json

# Stage environment
pls-cli list --group=<group-uuid> --stage
```

### List flags reference

| Flag      | Values | Default       | Notes                                                       |
| --------- | ------ | ------------- | ----------------------------------------------------------- |
| `--group` | UUID   | auto-selected | Required with `--json`; otherwise use the first group       |
| `--stage` | bool   | false         | Use staging environment                                     |
| `--json`  | bool   | false         | Requires `--group`; human messages go to stderr             |

List JSON shape (v1.2.0):

```json
{
  "assets": [
    {
      "id": "asset-uuid",
      "name": "example-model",
      "status": "ready",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

Upload JSON returns `assetId` and `status` only; construct the playable URL from the asset group UUID, not the account ID from `pls-cli status`:

```
https://stream.viverse.com/polygon_file/<group-uuid>/<asset-id>/model.xrg
```

On stage, use `https://stream-stage.viverse.com` with the same path. Existing enemy/player XRGs in a group reuse the same group UUID.

After upload:

1. Read `files[].assetId` from upload JSON (trailing object; see Section 8).
2. Resolve `group-uuid` from `--group`, `PLS_CLI_TEST_GROUP_UUID`, or the `auto-selected group: ... (uuid)` line on human `pls-cli list` stderr/stdout.
3. Write the constructed URL into the app manifest.
4. Verify streaming with a **GET** Range request; `curl -I` plus a Range header ignores Range and returns 200:

```bash
curl -s -D - -o /tmp/xrg.bin -H 'Range: bytes=0-15' \
  "https://stream.viverse.com/polygon_file/<group-uuid>/<asset-id>/model.xrg"
# Expect HTTP 206, content-range: bytes 0-15/<len>, body starting with v.00001
```

`HEAD` without Range returning 200 is an existence check; `GET` 206 verifies streaming.

---
## 6. Delete Asset

```bash
# Delete an asset by ID
pls-cli delete <asset-id>

# Stage environment
pls-cli delete <asset-id> --stage

# Machine-readable output
pls-cli delete <asset-id> --json
```

### Delete flags reference

| Flag      | Values | Default | Notes                                             |
| --------- | ------ | ------- | ------------------------------------------------- |
| `--stage` | bool   | false   | Use staging environment                           |
| `--json`  | bool   | false   | Write JSON to stdout; human messages go to stderr |

---

## 7. Tag Management

Tags are labels you can attach to assets. You can create them, list them, and assign them to assets after upload.

### tag create

```bash
# Create a tag in a group
pls-cli tag create --group=<group-uuid> "my-tag"

# Stage environment
pls-cli tag create --group=<group-uuid> --stage "my-tag"

# Machine-readable output
pls-cli tag create --group=<group-uuid> --json "my-tag"
```

### tag list

```bash
# List all tags in a group
pls-cli tag list --group=<group-uuid>

# Stage environment
pls-cli tag list --group=<group-uuid> --stage

# Machine-readable output
pls-cli tag list --group=<group-uuid> --json
```

### tag assign

```bash
# Assign one or more tags to an asset (positional args are tag UUIDs)
pls-cli tag assign --asset=<asset-uuid> <tag-uuid-1> <tag-uuid-2>

# Stage environment
pls-cli tag assign --asset=<asset-uuid> --stage <tag-uuid-1>

# Machine-readable output
pls-cli tag assign --asset=<asset-uuid> --json <tag-uuid-1> <tag-uuid-2>
```

### Tag flags reference

| Command      | Flag      | Values | Notes                                             |
| ------------ | --------- | ------ | ------------------------------------------------- |
| `tag create` | `--group` | UUID   | Required — group to create the tag in             |
| `tag create` | `--stage` | bool   | Use staging environment                           |
| `tag create` | `--json`  | bool   | Write JSON to stdout; human messages go to stderr |
| `tag list`   | `--group` | UUID   | Required — group to list tags from                |
| `tag list`   | `--stage` | bool   | Use staging environment                           |
| `tag list`   | `--json`  | bool   | Write JSON to stdout; human messages go to stderr |
| `tag assign` | `--asset` | UUID   | Required — asset to assign tags to                |
| `tag assign` | `--stage` | bool   | Use staging environment                           |
| `tag assign` | `--json`  | bool   | Write JSON to stdout; human messages go to stderr |

### --tags flag on upload and replace

Pass `--tags` to auto-create any missing tags and assign them to the asset after conversion:

```bash
# Upload with tags (auto-creates "foo" and "bar" if they don't exist)
pls-cli upload model.glb --group=<group-uuid> --tags=foo,bar

# Replace with tags
pls-cli replace <old-asset-id> new-model.glb --tags=foo,bar

# Combine with --json for machine-readable output
pls-cli upload model.glb --group=<group-uuid> --tags=foo,bar --json
```

`--tags` accepts a comma-separated list of tag **names**. The CLI:

1. Lists existing tags for the group
2. Creates any tags that don't already exist
3. Assigns all resolved tag UUIDs to the asset after conversion completes

## 8. Machine-Readable Output (--json)

When code must consume `pls-cli --json` output, read [JSON output reference](references/json-output.md) before running the command. It covers trailing-JSON extraction, response shapes, conversion failures, and shell parsing.

## 9. What the CLI Does Internally

Understanding this helps debug failures:

```
1. Validate file (format, size, count)
2. POST /management/asset  →  get { id, uploadUrl }
3. PUT $uploadUrl  (S3 direct upload; progress bar may print on stdout even with --json)
4. POST /management/asset/:id/convert
5. WebSocket wss://{domain}/management/user/ws  →  stream conversion progress
6. Exit 0 on "ready", exit 1 on "failed"
6.5. (optional) If --tags provided: resolve tag names → create missing tags → PUT /management/asset/:id/tags

Replace uses PUT /management/asset/:originId instead of POST at step 2.

List:
  GET /management/assets?group={uuid}  →  return asset list

Delete:
  DELETE /management/asset/:id  →  remove asset
```

---

## 10. Supported File Formats

| Format | Notes                         |
| ------ | ----------------------------- |
| `.zip` | Can bundle multiple resources |
| `.glb` | glTF binary                   |
| `.obj` | Wavefront OBJ                 |

Max file count: 10 per upload call.
Max file size: 500 MB per file (FREE tier limit from API).

---

## 11. Common Failures and Fixes

| Symptom                                              | Cause                                          | Fix                                                                      |
| ---------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `401 Unauthorized`                                   | Expired token or missing cookie                | Re-run `pls-cli login`                                                   |
| `credentials are for prod, but --stage was provided` | Env mismatch at login vs upload                | Re-login with the matching `--stage` flag                                |
| Error code 11                                        | Wrong password or malformed auth ticket        | Check credentials                                                        |
| Error code 1105                                      | Binary built without correct client ID ldflags | Install the official release binary from GitHub Releases (see Section 0) |
| Error code 1108                                      | Scope not allowed                              | Don't pass extra `--scopes`                                              |
| Conversion `status: "failed"`                        | Model file corrupted or unsupported            | Check `failedType` and `errorCode` in JSON output                        |
| `JSON.parse` fails on `--json` upload stdout         | Progress bars mixed into stdout                | Parse the trailing `{...}` object, not the whole stream                  |
| `list --json` empty / invalid JSON, exit 0           | `--group` omitted                              | Pass `--group=<uuid>`; human `list` without `--group` auto-selects       |
| Built XRG 404                                        | Used account id from `status` as URL prefix    | Use the **group** UUID in `/polygon_file/<group>/<assetId>/model.xrg`    |
| Binary not found                                     | pls-cli not installed                          | Install from GitHub Releases (see Section 0)                             |
| `unknown flag: --password`                           | pls-cli `v2.0.0`+ removed the flag             | Use `PLS_CLI_PASSWORD` or `--password-stdin` (see Section 2)             |
| Installed version older than GitHub latest           | Binary not updated                             | Run **Check for updates** (Section 0)                                    |
| Dev build fails at login                             | No client ID burned in                         | Install the official release binary from GitHub Releases (see Section 0) |
| `404 Not Found` on delete                            | Asset ID doesn't exist or already deleted      | Verify the asset ID with `pls-cli list`                                  |

---

## 12. Environments

| Env        | API base                           | WS base                          | Login flag |
| ---------- | ---------------------------------- | -------------------------------- | ---------- |
| Production | `https://stream.viverse.com`       | `wss://stream.viverse.com`       | (default)  |
| Stage      | `https://stream-stage.viverse.com` | `wss://stream-stage.viverse.com` | `--stage`  |

**Always match `--stage` between login and upload/replace.** The CLI enforces this at runtime and will exit with a clear error if they don't match.
