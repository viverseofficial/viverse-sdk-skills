# VIVERSE SDK: Play Lambda Service & Polygon Streaming CLI

*Author's Note: This document is designed for NotebookLM to generate a quick, high-level presentation introducing two new VIVERSE automation features.*

---

## Slide 1 Title: Introduction to New VIVERSE Features
**Key Points:**
- We are introducing two powerful new features to the VIVERSE SDK ecosystem to improve security and automation.
- **Feature 1: Play Lambda Service (PLS)** – A secure, serverless backend environment.
- **Feature 2: Polygon Streaming CLI (ps-cli)** – A command-line tool for automating 3D asset conversion.

---

## Slide 2 Title: Feature 1 - Play Lambda Service (PLS)
**Use Case:**
- **Goal:** Protect sensitive third-party API keys (e.g., Google Maps, Gemini AI) from being exposed in front-end browser code.
- Instead of the browser making direct requests to external services, PLS acts as a secure middleman.

**Working Flow:**
1. **Store Secrets:** Developers securely save API keys in the Lambda Environment (`/env`).
2. **Write Script:** A Lambda Script (`/script`) is written to safely make the external API call using those keys.
3. **Client Invoke:** The VIVERSE front-end simply calls `multiplayerClient.lambda.invoke()`.
4. **Return Data:** The Lambda script returns only the sanitized, safe results back to the user.

---

## Slide 3 Title: Automating PLS (sync-lambda-config)
**Use Case:**
- **Goal:** Safely deploy and manage Lambda keys and scripts via CI/CD pipelines without manual errors.

**Working Flow:**
1. **Plan Phase:** The `sync-lambda-config` CLI script performs a dry-run, showing what configurations will change (with secrets redacted).
2. **Review & Approve:** A human or Agent reviews the planned changes.
3. **Apply Phase:** Running the script with the `--approve` flag deploys the new scripts and environment variables to VIVERSE securely.

---

## Slide 4 Title: Feature 2 - Polygon Streaming CLI (ps-cli)
**Use Case:**
- **Goal:** Automate the conversion of standard 3D models (`.glb`, `.obj`, `.zip`) into VIVERSE's optimized Polygon Streaming format.
- Previously, this required developers to manually click through a Web UI, which blocked AI agents and automated pipelines from spawning new assets dynamically.

**Working Flow:**
1. **Authenticate:** Run `ps-cli login` to securely cache credentials for Stage or Production.
2. **Upload/Convert:** Run `ps-cli upload model.glb`. The CLI automatically uploads the file and streams the conversion progress.
3. **Automate with AI:** By adding the `--json` flag, the CLI outputs a clean `assetId`. An AI agent can parse this ID and instantly spawn the optimized 3D asset inside the VIVERSE scene.
4. **Iterate:** Use `ps-cli replace <assetId> new-model.glb` to seamlessly update an existing asset during active development.
