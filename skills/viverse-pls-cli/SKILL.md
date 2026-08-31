---
name: viverse-pls-cli
description: Convert 3D models (.zip/.glb/.obj) to Polygon Streaming format on VIVERSE using pls-cli. Handles upload, replace, list, and delete operations. Use when the task involves converting models to Polygon Streaming, uploading assets, or managing assets on VIVERSE stage/prod environments.
---

# pls-cli — VIVERSE Polygon Streaming CLI

Operational guide for AI agents running pls-cli to manage 3D model assets on VIVERSE.

## When to Activate

- User wants to upload a model file (.zip, .glb, .obj) to VIVERSE
- User wants to replace an existing asset by asset ID
- User wants to list assets in a group
- User wants to delete an asset by ID
- Running pls-cli operations against stage API
- Debugging upload/conversion failures

---

## 0. Install pls-cli

### Check if already installed

```bash
which pls-cli || ls ~/bin/pls-cli 2>/dev/null || ls /usr/local/bin/pls-cli 2>/dev/null
```

If found, skip this section.

### Install from GitHub Releases (recommended)

Detect OS and architecture, then download the correct binary:

```bash
OS=$(uname -s | tr '[:upper:]' '[:lower:]')   # darwin or linux
ARCH=$(uname -m)                               # x86_64 or arm64
VERSION="v1.0.0"                               # or latest tag from GitHub

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
Always read from env vars:

```bash
source .env   # loads PLS_CLI_TEST_EMAIL, PLS_CLI_TEST_PASSWORD, PLS_CLI_TEST_GROUP_UUID
```

If `.env` doesn't exist, ask the user to set the variables in their terminal before proceeding.

---

## 2. Authentication

The CLI uses cookie-based auth stored in `~/.pls-cli/credentials.json`.
There is **no token env var** — you must log in first with `pls-cli login`.

### Login (saves credentials to ~/.pls-cli/credentials.json)

```bash
# Stage
pls-cli login --stage \
  --email="$PLS_CLI_TEST_EMAIL" \
  --password="$PLS_CLI_TEST_PASSWORD"

# Production
pls-cli login \
  --email="$PLS_CLI_TEST_EMAIL" \
  --password="$PLS_CLI_TEST_PASSWORD"
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
| `--json`           | bool                            | false         | Write JSON to stdout; human messages go to stderr |
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

## 5. List Assets

```bash
# List all assets in your default group
pls-cli list

# With explicit group
pls-cli list --group=<group-uuid>

# Stage environment
pls-cli list --group=<group-uuid> --stage

# Machine-readable output (for agent parsing — recommended)
pls-cli list --json
```

### List flags reference

| Flag      | Values | Default       | Notes                                             |
| --------- | ------ | ------------- | ------------------------------------------------- |
| `--group` | UUID   | auto-selected | Omit to use your first group automatically        |
| `--stage` | bool   | false         | Use staging environment                           |
| `--json`  | bool   | false         | Write JSON to stdout; human messages go to stderr |

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

---

## 8. Machine-Readable Output (--json)

Always pass `--json` when the result needs to be parsed programmatically.

**Human-readable messages go to stderr; structured result goes to stdout.**

### Upload JSON output

```json
{
  "files": [
    {
      "file": "model.zip",
      "assetId": "abc-123-uuid",
      "status": "ready"
    }
  ]
}
```

### Upload JSON output (with --tags)

When `--tags` is used, the upload JSON output includes a `"tags"` field:

```json
{
  "files": [
    {
      "file": "model.zip",
      "assetId": "abc-123-uuid",
      "status": "ready"
    }
  ],
  "tags": [
    { "uuid": "tag-uuid-1", "name": "foo" },
    { "uuid": "tag-uuid-2", "name": "bar" }
  ]
}
```

### tag create JSON output

```json
{ "uuid": "tag-uuid-1", "name": "my-tag" }
```

### tag list JSON output

```json
{
  "tags": [
    { "uuid": "tag-uuid-1", "name": "foo" },
    { "uuid": "tag-uuid-2", "name": "bar" }
  ]
}
```

### tag assign JSON output

```json
{ "assetId": "asset-uuid", "tagUuids": ["tag-uuid-1", "tag-uuid-2"] }
```

### List JSON output

```json
{
  "assets": [
    {
      "id": "asset-uuid-1",
      "name": "model.glb",
      "status": "ready",
      "createdAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "asset-uuid-2",
      "name": "scene.zip",
      "status": "converting",
      "createdAt": "2025-01-15T11:00:00Z"
    }
  ]
}
```

### Delete JSON output

```json
{ "assetId": "asset-uuid", "deleted": true }
```

### Delete JSON output (failure)

```json
{ "assetId": "asset-uuid", "deleted": false }
```

### Replace JSON output

```json
{
  "originId": "old-asset-uuid",
  "file": "new-model.glb",
  "assetId": "new-asset-uuid",
  "status": "ready"
}
```

### Failure case

```json
{
  "files": [
    {
      "file": "bad-model.zip",
      "assetId": "abc-123-uuid",
      "status": "failed",
      "failedType": "convert",
      "error": "Model file corrupted",
      "errorCode": "INVALID_MODEL"
    }
  ]
}
```

**Status values**: `"ready"` (success) | `"failed"` (conversion failed)

### Shell parsing example

```bash
# Check if upload succeeded
result=$(pls-cli upload model.zip --json 2>/dev/null)
status=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['files'][0]['status'])")
asset_id=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['files'][0]['assetId'])")
```

---

## 9. What the CLI Does Internally

Understanding this helps debug failures:

```
Upload / Replace flow:
  1. Validate file (format, size, count)
  2. POST /management/asset  →  get { id, uploadUrl }
  3. PUT $uploadUrl  (S3 direct upload, shows progress bar on stderr)
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
| Binary not found                                     | pls-cli not installed                          | Install from GitHub Releases (see Section 0)                             |
| Dev build fails at login                             | No client ID burned in                         | Install the official release binary from GitHub Releases (see Section 0) |
| `404 Not Found` on delete                            | Asset ID doesn't exist or already deleted      | Verify the asset ID with `pls-cli list`                                  |

---

## 12. Environments

| Env        | API base                           | WS base                          | Login flag |
| ---------- | ---------------------------------- | -------------------------------- | ---------- |
| Production | `https://stream.viverse.com`       | `wss://stream.viverse.com`       | (default)  |
| Stage      | `https://stream-stage.viverse.com` | `wss://stream-stage.viverse.com` | `--stage`  |

**Always match `--stage` between login and upload/replace.** The CLI enforces this at runtime and will exit with a clear error if they don't match.
