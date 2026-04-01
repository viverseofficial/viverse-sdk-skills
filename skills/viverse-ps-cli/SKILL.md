---
name: viverse-ps-cli
description: Upload and replace 3D model assets to VIVERSE using ps-cli. Use when the task involves uploading .zip/.glb/.obj files to VIVERSE, replacing existing assets, managing model conversion, or running ps-cli commands against stage/prod environments.
---

# ps-cli — VIVERSE Model Upload/Replace CLI

Operational guide for AI agents running ps-cli to upload or replace 3D models on VIVERSE.

## When to Activate

- User wants to upload a model file (.zip, .glb, .obj) to VIVERSE
- User wants to replace an existing asset by asset ID
- Running smoke tests or integration tests against stage API
- Debugging upload/conversion failures
- Building or cross-compiling the ps-cli binary

---

## 0. Install ps-cli

### Check if already installed

```bash
which ps-cli || ls ~/bin/ps-cli 2>/dev/null || ls /usr/local/bin/ps-cli 2>/dev/null
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

BINARY="ps-cli-${OS}-${ARCH}"
URL="https://github.com/ViveportSoftware/ps-cli/releases/download/${VERSION}/${BINARY}"

mkdir -p ~/bin
curl -fsSL "$URL" -o ~/bin/ps-cli
chmod +x ~/bin/ps-cli
```

> **Windows**: Download `ps-cli-windows-amd64.exe` from the releases page and add it to your PATH.

### Add ~/bin to PATH (if not already)

```bash
# Check if ~/bin is in PATH
echo $PATH | grep -q "$HOME/bin" || export PATH="$HOME/bin:$PATH"

# To persist, add to ~/.zshrc or ~/.bashrc:
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
```

### Verify installation

```bash
ps-cli version
```

---

## 1. Before Running Commands

### Credential safety rule

NEVER pass email or password as literal values in shell commands — they appear in logs.
Always read from env vars:

```bash
source .env   # loads PS_CLI_TEST_EMAIL, PS_CLI_TEST_PASSWORD, PS_CLI_TEST_GROUP_UUID
```

If `.env` doesn't exist, ask the user to set the variables in their terminal before proceeding.

### Check if binary exists

```bash
ls bin/ps-cli
```

If it doesn't exist, build first (see Section 1).

---

## 2. Build from Source (optional)

```bash
# Standard dev build (no client ID or version burned in — use for local testing only)
go build -o bin/ps-cli ./cmd/ps-cli

# Production build (client ID + version required for real auth against VIVERSE API)
source .env  # PS_CLI_CLIENT_ID from .env (see .env.example)
VERSION=$(git describe --tags --abbrev=0)
LDFLAG="-X dev.azure.com/viveportengineering/POC/ps-cli/internal/auth.DefaultClientID=${PS_CLI_CLIENT_ID} -X main.version=${VERSION}"
mkdir -p bin
go build -ldflags "${LDFLAG}" -o bin/ps-cli ./cmd/ps-cli
```

**Rule**: Always output to `bin/`. Never write binaries to the project root or any other directory.

**Note**: A dev build (no ldflags) will fail at `login` with "missing client ID" — this is expected. Use the production build for any real API interaction.

---

## 3. Authentication

The CLI uses cookie-based auth stored in `~/.ps-cli/credentials.json`.
There is **no token env var** — you must log in first with `ps-cli login`.

### Login (saves credentials to ~/.ps-cli/credentials.json)

```bash
# Stage
bin/ps-cli login --stage \
  --email="$PS_CLI_TEST_EMAIL" \
  --password="$PS_CLI_TEST_PASSWORD"

# Production
bin/ps-cli login \
  --email="$PS_CLI_TEST_EMAIL" \
  --password="$PS_CLI_TEST_PASSWORD"
```

### Verify login succeeded

```bash
bin/ps-cli status
# Outputs: email, account ID, environment (stage/prod), token expiry
```

### Environment mismatch — handled automatically

If you run `upload --stage` but logged in for prod (or vice versa), the CLI will **exit with an error before touching the API**:

```
error: credentials are for prod environment, but --stage flag was provided
Re-run: ps-cli login --stage
```

You do not need to manually check the environment — the CLI enforces it.

---

## 4. Upload

```bash
# Minimal — --group is OPTIONAL (CLI auto-selects your first group if omitted)
bin/ps-cli upload model.zip

# With explicit group
bin/ps-cli upload model.zip --group=<group-uuid>

# Stage environment
bin/ps-cli upload model.zip --group=<group-uuid> --stage

# With conversion options
bin/ps-cli upload model.glb \
  --group=<group-uuid> \
  --stage \
  --ai-enhance \
  --collider \
  --resolution=high \
  --collider-scale=5

# Multi-file (max 10 files)
bin/ps-cli upload file1.zip file2.glb file3.obj --group=<group-uuid>

# Machine-readable output (for agent parsing — recommended)
bin/ps-cli upload model.zip --json
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

---

## 5. Replace

```bash
# Replace existing asset by ID
bin/ps-cli replace <old-asset-id> new-model.zip

# Stage
bin/ps-cli replace <old-asset-id> new-model.glb --stage

# With collider + machine-readable output
bin/ps-cli replace <old-asset-id> new-model.obj --collider --collider-scale=10 --json
```

Replace shares the same flags as upload except `--group` (originId is provided instead).

---

## 6. Machine-Readable Output (--json)

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
result=$(bin/ps-cli upload model.zip --json 2>/dev/null)
status=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['files'][0]['status'])")
asset_id=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['files'][0]['assetId'])")
```

---

## 7. What the CLI Does Internally

Understanding this helps debug failures:

```
1. Validate file (format, size, count)
2. POST /management/asset  →  get { id, uploadUrl }
3. PUT $uploadUrl  (S3 direct upload, shows progress bar on stderr)
4. POST /management/asset/:id/convert
5. WebSocket wss://{domain}/management/user/ws  →  stream conversion progress
6. Exit 0 on "ready", exit 1 on "failed"
```

Replace uses `PUT /management/asset/:originId` instead of POST at step 2.

---

## 8. Supported File Formats

| Format | Notes                         |
| ------ | ----------------------------- |
| `.zip` | Can bundle multiple resources |
| `.glb` | glTF binary                   |
| `.obj` | Wavefront OBJ                 |

Max file count: 10 per upload call.
Max file size: 500 MB per file (FREE tier limit from API).

---

## 9. Running Tests

```bash
# Unit + integration tests (race detection)
go test -race ./...

# Stage E2E tests (requires credentials)
source .env
go test -v -timeout 300s -run '^TestStage' ./cmd/ps-cli/
```

Tests auto-skip when `PS_CLI_TEST_EMAIL` / `PS_CLI_TEST_PASSWORD` are unset.

---

## 10. Common Failures and Fixes

| Symptom                                              | Cause                                          | Fix                                               |
| ---------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| `401 Unauthorized`                                   | Expired token or missing cookie                | Re-run `bin/ps-cli login`                         |
| `credentials are for prod, but --stage was provided` | Env mismatch at login vs upload                | Re-login with the matching `--stage` flag         |
| Error code 11                                        | Wrong password or malformed auth ticket        | Check credentials                                 |
| Error code 1105                                      | Binary built without correct client ID ldflags | Rebuild with `CLIENT_ID` ldflags (see Section 1)  |
| Error code 1108                                      | Scope not allowed                              | Don't pass extra `--scopes`                       |
| Conversion `status: "failed"`                        | Model file corrupted or unsupported            | Check `failedType` and `errorCode` in JSON output |
| Binary not found                                     | `bin/` missing                                 | Run build step first                              |
| Dev build fails at login                             | No client ID burned in                         | Rebuild with ldflags (see Section 1)              |

---

## 11. Environments

| Env        | API base                           | WS base                          | Login flag |
| ---------- | ---------------------------------- | -------------------------------- | ---------- |
| Production | `https://stream.viverse.com`       | `wss://stream.viverse.com`       | (default)  |
| Stage      | `https://stream-stage.viverse.com` | `wss://stream-stage.viverse.com` | `--stage`  |

**Always match `--stage` between login and upload/replace.** The CLI enforces this at runtime and will exit with a clear error if they don't match.
