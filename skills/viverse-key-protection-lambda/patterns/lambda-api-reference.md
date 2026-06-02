# Play Lambda Service — API Reference

Base URL: `/api/play-lambda-service/v1`

All **admin REST API** endpoints (`/env`, `/script`, `/jobs`) require:
```
Authkey: <auth_key>
Content-Type: application/json   (POST only)
```
`Authkey` is a **server/CI-side credential** used to manage env variables and scripts via the admin API. It is **not** the end-user `accessToken` used in `lambda.invoke()`. Never send `Authkey` to the browser or include it in frontend code.

---

## Agent Workflow Rules

Before making any call:

1. Always confirm `game_id` first. If missing, ask the developer — do **not** fall back to account-level scope.
2. Read current state before updating anything (GET before POST) to avoid overwriting existing content.
3. Confirm `event_name` before creating or updating a script.
4. When querying jobs, prefer filtering by `game_id`, `status`, and `event_name`.

---

## 1. Env API

### GET /env — Query env

```
GET /env?game_id={game_id}
Authkey: <auth_key>
```

Response:
```json
{
  "success": true,
  "variables": {
    "GEMINI_API_KEY": "...",
    "GEMINI_API_URL": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    "GOOGLE_APPLICATION_URL": "https://...",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON": "{\"type\":\"service_account\",...}"
  }
}
```

---

### POST /env — Create or update env

Merges with existing variables — keys not listed are preserved.

```
POST /env
Authkey: <auth_key>
Content-Type: application/json

{
  "game_id": "game-foo-123",
  "variables": {
    "GEMINI_API_KEY": "...",
    "GEMINI_API_URL": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
  }
}
```

Response: `{ "success": true }`

---

### DELETE /env — Delete a single env key

```
DELETE /env?game_id={game_id}&key={key}
Authkey: <auth_key>
```

Example:
```bash
curl -X DELETE "http://broadcasting-gateway-gaming.vrprod.viveport.com/api/play-lambda-service/v1/env?game_id=game-foo-123&key=GEMINI_API_KEY" \
  -H "Authkey: auth_key"
```

---

## 2. Script API

**Scope rule:** Scripts are stored under `game_id + event_name` scope. Always use both when reading or writing.

**Upsert workflow:**
1. Call `GET /script?game_id=...&event_name=...` first to check if a script already exists.
2. If it exists, preserve the existing business logic — only extend or modify what is needed.
3. Keep secrets and endpoints in env, not hard-coded in the script.
4. Always include `console.*` logs and a `reply(...)` call.

### GET /script — Query all scripts for a game

```
GET /script?game_id={game_id}
Authkey: <auth_key>
```

---

### GET /script — Query a single script

```
GET /script?game_id={game_id}&event_name={event_name}
Authkey: <auth_key>
```

---

### POST /script — Create or update script

```
POST /script
Authkey: <auth_key>
Content-Type: application/json

{
  "game_id": "game-foo-123",
  "event_name": "onDailyLogin",
  "code": "var name = (context.data || {}).name || \"guest\"; reply({ message: \"hello \" + name });"
}
```

Response: `{ "success": true }`

---

### DELETE /script — Delete script

```
DELETE /script?game_id={game_id}&event_name={event_name}
Authkey: <auth_key>
```

---

## 3. Jobs API

### GET /jobs — Query job list

```
GET /jobs?game_id={game_id}&status={status}&event_name={event_name}&limit={limit}
Authkey: <auth_key>
```

| Param | Required | Description |
|-------|----------|-------------|
| `game_id` | yes | Target game id |
| `status` | no | `pending` / `running` / `succeeded` / `failed` / `timeout` |
| `event_name` | no | Filter by event |
| `limit` | no | Max records returned |

Response:
```json
{
  "success": true,
  "jobs": [
    {
      "job_id": "64bb2f...91",
      "game_id": "game-foo-123",
      "event_name": "onDailyLogin",
      "status": "succeeded",
      "result": { "reward": 500 },
      "error": "",
      "created_at": "2026-03-09T10:00:00Z",
      "updated_at": "2026-03-09T10:00:02Z",
      "request_id": "req-xxx-123",
      "logs": [
        { "timestamp": "2026-03-09T10:00:00Z", "level": "JS LOG", "message": "onDailyLogin starting..." },
        { "timestamp": "2026-03-09T10:00:01Z", "level": "JS LOG", "message": "fetch internal API: ok" },
        { "timestamp": "2026-03-09T10:00:02Z", "level": "JS LOG", "message": "reward granted: 500" }
      ]
    }
  ]
}
```

---

## 4. In-Script Runtime API

Lambda scripts run in a server-side JS sandbox. Available globals:

| Name | Type | Description |
|------|------|-------------|
| `context.data` | object | Request payload passed by client via `lambda.invoke()` |
| `reply(data)` | function | Return result to the client. Must be called at least once. |
| `getEnv(key)` | function | Read a secret env variable for the current game scope |
| `getGoogleToken(jsonKey, ...scopes)` | function | Generate a Google OAuth2 access token from a service account JSON key. Defaults to `cloud-platform` scope if none provided. |
| `fetch(url, options)` | function | Send an outbound HTTP request. Only `http`/`https` allowed; localhost and private IPs are blocked. Returns `{ status, body }` synchronously. |
| `console.log/info/warn/error(...)` | functions | Write logs visible in `GET /jobs` response |

### `fetch()` return shape and errors

`fetch()` in the sandbox is **not** the standard browser Fetch API. It returns `{ status, body }` directly (no `await`, no `.json()`). The body is auto-parsed as JSON if the response is JSON, otherwise returned as a string.

```js
var resp = fetch(endpoint, { method: "POST", headers: { ... }, body: JSON.stringify(payload) });
// resp.status  → HTTP status code (number)
// resp.body    → parsed JSON object, or string
```

Special return values:
- `forbidden_url` — target is localhost or a private IP
- `external_service_error` — outbound network call failed

### `getGoogleToken()` usage

Use for Vertex AI and other Google APIs requiring OAuth2 bearer tokens:

```js
var token = getGoogleToken(getEnv("GOOGLE_APPLICATION_CREDENTIALS_JSON"));
// optionally pass scopes:
// var token = getGoogleToken(saJson, "https://www.googleapis.com/auth/cloud-platform");
```

---

## 5. Script Examples

### Gemini API Key (REST)

```js
var apiKey = getEnv("GEMINI_API_KEY");
var endpoint = getEnv("GEMINI_API_URL"); // https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent

console.log("Starting Gemini API request...");

if (!apiKey) {
    console.error("Critical error: GEMINI_API_KEY is not defined in environment variables.");
    reply({ success: false, error: "missing GEMINI_API_KEY" });
} else if (!endpoint) {
    console.error("Critical error: GEMINI_API_URL is not defined in environment variables.");
    reply({ success: false, error: "missing GEMINI_API_URL" });
} else {
    var input = context.data || {};
    var prompt = input.prompt || "Hello";
    console.info("Target prompt: " + prompt);

    var resp = fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    var body = resp.body || {};
    if (resp.status !== 200) {
        console.error("Gemini API returned error status: " + resp.status);
        reply({ success: false, error: "gemini request failed", status: resp.status, body: body });
    } else {
        console.log("Gemini API call successful.");
        var resultText = "";
        if (body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts) {
            resultText = body.candidates[0].content.parts[0].text || "";
        }
        reply({ success: true, result: resultText });
    }
}
```

### Gemini Vertex AI Image Generation

```js
var saJsonString = getEnv("GOOGLE_APPLICATION_CREDENTIALS_JSON");
var endpoint = getEnv("GOOGLE_APPLICATION_URL");

console.log("Starting Image Generation script...");

if (!saJsonString) {
  console.error("Critical error: GOOGLE_APPLICATION_CREDENTIALS_JSON is missing from environment.");
  reply({ success: false, error: "missing GOOGLE_APPLICATION_CREDENTIALS_JSON in env" });
} else if (!endpoint) {
  console.error("Critical error: GOOGLE_APPLICATION_URL is missing from environment.");
  reply({ success: false, error: "missing GOOGLE_APPLICATION_URL in env" });
} else {
  try {
    console.log("Generating Google OAuth2 token...");
    var token = getGoogleToken(saJsonString);

    var input = context.data || {};
    var prompt = input.prompt || "A rainy Taipei street at night, neon reflections on the ground, cyberpunk style, 16:9 composition.";
    console.info("Processing prompt: " + prompt);

    var reqBody = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], maxOutputTokens: 10 }
    };

    console.log("Calling Gemini Vertex AI (Image Generation Mode)...");
    var resp = fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(reqBody)
    });

    var body = resp.body || {};
    if (resp.status < 200 || resp.status >= 300) {
      console.error("API request failed with status: " + resp.status);
      reply({ success: false, error: "gemini request failed", status: resp.status, body: body });
    } else {
      var imageBase64 = null;
      if (body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts) {
        var parts = body.candidates[0].content.parts;
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].inlineData && parts[i].inlineData.mimeType.startsWith("image/")) {
            imageBase64 = parts[i].inlineData.data;
            break;
          }
        }
      }
      if (imageBase64) {
        console.info("Successfully received generated image.");
        reply({ success: true, message: "Image generated successfully", image_base64: imageBase64 });
      } else {
        console.warn("API call succeeded but no image content was found in the response.");
        reply({ success: true, message: "No image generated (maybe filtered)", body: body });
      }
    }
  } catch (e) {
    console.error("Runtime exception: " + e.toString());
    reply({ success: false, error: "Failed to execute script: " + e.toString() });
  }
}
```

---

## 6. Client Invoke API

```js
const playClient = new globalThis.viverse.play();
const multiplayerClient = await playClient.newMultiplayerClient(roomId, appId, userSessionId);
await multiplayerClient.init();

const res = await multiplayerClient.lambda.invoke(eventName, eventData, accessToken);
if (res.status !== "succeeded") {
  if (res.status === "unauthorized") { triggerReAuth(); return; }
  throw new Error(res.error || res.status);
}
// parse res.result by event-specific schema — no universal shape assumed
```

### Client status codes

| Status | Meaning | Action |
|--------|---------|--------|
| `succeeded` | Script ran and called `reply()` | Parse `result` by event schema |
| `failed` | Script or external dependency failed | Check `error` and `logs` |
| `timeout` | Script exceeded time limit | Retry with bounded backoff |
| `unauthorized` | `accessToken` invalid or expired | Force re-auth flow |
| `configuration_error` | Script missing or env not fully set up | Alert ops, block feature |
| `script_error` | Runtime error inside script | Show safe error, keep logs |

---

## 7. Common Errors

| Error | Meaning | Agent action |
|-------|---------|--------------|
| `missing Authkey header` | Required header absent | Check headers, resend |
| `game_id and event_name are required` | Required fields missing | Ask developer for values — do not guess |
| `rate_limit_exceeded` | Too many requests or running jobs | Do not retry immediately; tell developer to try later |
| `configuration_error` | Script can't find its target or env is incomplete | Check script exists; verify env keys are set |
| `script not found` | Single-script lookup found no match | Report to developer; ask whether to create it |
| `job not found` | `job_id` doesn't exist or wrong scope | Confirm game/event was invoked; query newer jobs |
| `failed` | Job ran but script or dependency failed | Inspect `error` and `logs` fields |
| `timeout` | Job execution timed out | Check if script or external service is too slow |

---

## 8. Notes

- Env values are stored encrypted in the database.
- Env scope: `game_id` (or `account_id` — but always use `game_id` in agent workflows).
- Script scope: `game_id + event_name`.
- Jobs list only returns data under the current scope.
- `Authkey` is for admin/CI operations (`/env`, `/script`, `/jobs`) only — never ship in client code.


---

## Admin REST API

### GET /env

Fetch the current env variables for a game scope.

```
GET /env?game_id={game_id}
Authkey: <LAMBDA_AUTHKEY>
```

Response:
```json
{
  "success": true,
  "variables": {
    "GOOGLE_PLACES_API_KEY": "...",
    "GOOGLE_TILES_API_KEY": "..."
  }
}
```

---

### POST /env

Upsert env variables for a game scope. Merges with existing variables — keys not listed are preserved.

```
POST /env
Authkey: <LAMBDA_AUTHKEY>
Content-Type: application/json

{
  "game_id": "<game_id>",
  "variables": {
    "GOOGLE_PLACES_API_KEY": "...",
    "GOOGLE_TILES_API_KEY": "..."
  }
}
```

Response:
```json
{ "success": true }
```

---

### GET /script

Fetch the current script code for a specific event.

```
GET /script?game_id={game_id}&event_name={event_name}
Authkey: <LAMBDA_AUTHKEY>
```

Response (any of these shapes may be returned — handle all three):
```json
{ "code": "..." }
{ "script": { "code": "..." } }
{ "data": { "code": "..." } }
```

---

### POST /script

Upsert the script code for a specific event.

```
POST /script
Authkey: <LAMBDA_AUTHKEY>
Content-Type: application/json

{
  "game_id": "<game_id>",
  "event_name": "places_search_event",
  "code": "..."
}
```

Response:
```json
{ "success": true }
```

---

### GET /jobs

List recent job executions (invocations) for a game scope. Useful for verifying script executions and debugging.

```
GET /jobs?game_id={game_id}&limit=20
Authkey: <LAMBDA_AUTHKEY>
```

Response:
```json
{ "success": true, "jobs": [ ... ] }
```

---

## In-Script Runtime API

Lambda scripts run in a server-side JS sandbox. Available globals:

### `getEnv(key)`

Read a secret env variable set via `/env`. Returns a string.

```js
const apiKey = getEnv("GOOGLE_PLACES_API_KEY");
```

### `reply(object)`

Send a response back to the invoking client. Must be called exactly once.

```js
reply({ success: true, places: results });
reply({ success: false, error: "validation_failed" });
```

### `context.data`

The event payload passed by the client via `lambda.invoke(eventName, eventData, accessToken)`. Validate all fields before use.

```js
const { query, maxResults } = context.data;
if (!query) { reply({ success: false, error: "missing_query" }); return; }
```

### `fetch(url, init)`

Standard Fetch API for outbound HTTP. Use this (with `getEnv`) for all secret-bearing external calls.

```js
const res = await fetch(endpoint, {
  method: "POST",
  headers: { "X-Goog-Api-Key": getEnv("GOOGLE_PLACES_API_KEY") },
  body: JSON.stringify(payload)
});
const data = await res.json();
```

### `console.log / console.info / console.warn / console.error`

Log output is captured in job execution records (visible via `GET /jobs`).

---

## Client Invoke API

Invoke a Lambda event from browser code using the VIVERSE Play SDK.

```js
const playClient = new globalThis.viverse.play();
const multiplayerClient = await playClient.newMultiplayerClient(roomId, appId, userSessionId);
await multiplayerClient.init();

const res = await multiplayerClient.lambda.invoke(eventName, eventData, accessToken);
```

### Response shape

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | See status codes below |
| `result` | object | Event-defined payload set by `reply()` in the script |
| `error` | string | Error message when status is not `"succeeded"` |

### Status codes

| Status | Meaning | Client action |
|--------|---------|---------------|
| `succeeded` | Script ran and called `reply()` | Parse `result` by event schema |
| `failed` | Script threw or returned an error | Show safe error message, log |
| `timeout` | Script exceeded execution time limit | Retry with bounded backoff |
| `unauthorized` | `accessToken` invalid or expired | Force re-auth flow |
| `configuration_error` | Env keys or script missing for this event | Alert ops, block feature |
| `script_error` | Runtime error inside script | Show safe error message, keep logs |

### Fail-closed pattern

```js
const res = await multiplayerClient.lambda.invoke(eventName, eventData, accessToken);
if (res.status !== "succeeded") {
  if (res.status === "unauthorized") { triggerReAuth(); return; }
  throw new Error(res.error || res.status);
}
const { places } = res.result; // parse by event-specific schema
```

---

## Minimal Script Template

```js
// event: my_event_name
// input: context.data.query (string, required)
// output: reply({ success, items })

const query = context.data?.query;
if (!query) {
  reply({ success: false, error: "missing_query" });
  return;
}

const apiKey = getEnv("MY_SERVICE_API_KEY");
if (!apiKey) {
  reply({ success: false, error: "configuration_error" });
  return;
}

try {
  const res = await fetch("https://api.example.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  reply({ success: true, items: data.results ?? [] });
} catch (err) {
  console.error("script error:", err);
  reply({ success: false, error: "upstream_failed" });
}
```
