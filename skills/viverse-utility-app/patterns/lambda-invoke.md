# Lambda Invoke Pattern (lambda-tool-v1)

Use this pattern when app.js needs to call external APIs via Play Lambda.

## Invoke Call

```js
import ViverseLambda from './viverseLambda.js';

async function callApi(authState) {
  const { accessToken, accountId } = authState.profile;
  const appId = APP_CONFIG.appId;

  // Guard — never invoke without full auth context
  if (!accessToken || !accountId || !appId) return;

  try {
    const result = await ViverseLambda.invoke(
      'my_event',              // must match lambda/my_event.js
      { param: value },        // becomes context.data in lambda script
      accessToken,
      { appId, userId: accountId }
    );

    if (!result?.success) throw new Error(result?.error || 'invoke failed');
    // result is already decoded from Play SDK Key/Value format
    return result;
  } catch (err) {
    // Show user-readable error — never expose raw Lambda errors
    handleError(err.message);
  }
}
```

## Event Script Shape

```js
// lambda/my_event.js — deployed to Play Lambda, not bundled in frontend
var apiKey = getEnv('MY_API_KEY');         // secret from Lambda env
if (!apiKey) {
  reply({ success: false, error: 'missing MY_API_KEY' });
} else {
  var input = context.data || {};
  var param = String(input.param || '').trim();
  if (!param) { reply({ success: false, error: 'missing param' }); }
  else {
    console.log('[my_event] param:', param);
    var resp = fetch('https://api.example.com/endpoint', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ param: param })
    });
    if (resp.status !== 200) {
      reply({ success: false, error: 'upstream failed', status: resp.status });
    } else {
      // Sanitize — return only what the client needs
      reply({ success: true, data: resp.body.relevant_field });
    }
  }
}
```

## Client Error Handling

Map all non-success statuses to user messages:

```js
// ViverseLambda.invoke() throws on non-succeeded status
// Catch and map to UI:
catch (err) {
  const msg = err.message || '';
  if (msg.includes('unauthorized'))         setError('Session expired. Please login again.');
  else if (msg.includes('configuration'))   setError('Service unavailable. Contact support.');
  else if (msg.includes('timeout'))         setError('Request timed out. Try again.');
  else                                      setError('Something went wrong. Try again.');
}
```

## Polling / Auto-Refresh

```js
// Minimum 30s — invoke is job-style, not streaming
const SAFE_INTERVAL_MS = Math.max(refreshIntervalSeconds * 1000, 30_000);
const timer = setInterval(fetchData, SAFE_INTERVAL_MS);
```

## Synthetic Room

`viverseLambda.js` uses `roomId = "lambda-{appId}"` — no matchmaking needed.
The `ensure()` method reuses the existing `multiplayerClient` if `appId` hasn't changed,
so repeated `invoke()` calls don't create new sessions.

## File Naming Convention

Lambda event files: `{capability}_event.js`

Examples: `weather_event.js`, `prices_event.js`, `ai_chat_event.js`, `places_search_event.js`

The `eventName` passed to `invoke()` must exactly match the filename without `.js`.

## Lambda Env Keys

Document all required keys in `.env.lambda.example`:

```bash
LAMBDA_AUTHKEY=replace_with_lambda_authkey
LAMBDA_GAME_ID=replace_with_real_app_id
MY_API_KEY=replace_with_your_key
# MY_API_URL=https://api.example.com/endpoint  # optional override
```

Push to Lambda env via `sync-lambda-config.sh` — never commit real values.
