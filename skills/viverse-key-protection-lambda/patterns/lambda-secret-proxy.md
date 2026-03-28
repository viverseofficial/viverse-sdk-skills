# Lambda Secret Proxy Pattern

Use this pattern for secret-bearing request/response calls where client code must not include upstream API keys.

## Fit Criteria

- Low or medium QPS workflows
- Input payload can be validated in script
- Output can be sanitized before returning to client
- `invoke()` latency is acceptable

## Script Contract

1. Validate `context.data` early.
2. Read secret with `getEnv("...")`.
3. Use `fetch(...)` with secret in header/body only inside Lambda.
4. Return only sanitized fields with `reply({ success, ... })`.
5. Emit `console.log/info/warn/error` for job traceability.

## Client Contract

1. `await multiplayerClient.init()` before invoke.
2. `await multiplayerClient.lambda.invoke(eventName, eventData, accessToken)`.
3. Fail closed when `status !== "succeeded"`.
4. Parse `result` by event-specific schema (no global assumption).

## Failure Handling

- `unauthorized`: force re-auth flow
- `configuration_error`: alert ops, block feature
- `script_error`: show safe error message, keep logs
- `timeout`: retry with bounded backoff

