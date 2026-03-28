# VIVERSE Hub Resilience Guide (v5.3 - Avatar Hardened)

> [!IMPORTANT]
> **MANDATORY RELEASE BLOCKER CHECKLIST**
> Before any VIVERSE publish:
> 1. [ ] **SDK Global Detection**: resolve SDK from `window.vSdk || window.viverse || window.VIVERSE_SDK`.
> 2. [ ] **Auth Client Constructor**: prefer `new ClientCtor({ clientId, domain })` and fallback to `{ appId, domain }` only for compatibility.
> 3. [ ] **Handshake Stability**: check `sdk.bridge?.isReady` and wait 1200ms after SDK detection before `checkAuth()`.
> 4. [ ] **Strategy 0 Profile Recovery**: Immediately extract `user_name` and `picture` from the `checkAuth()` response object for instant UI update.
> 5. [ ] **Canonical Profile Chain**: `avatar.getProfile` -> `getUserInfo` -> `getUser` -> `getProfileByToken` -> direct API fallback.
> 6. [ ] **Shotgun Avatar Constructor**: Provide `accessToken`, `token`, AND `authorization` keys; set `baseURL: "https://sdk-api.viverse.com/"`.
> 7. [ ] **CORS Safety**: never use `accesstoken` header/key.
> 8. [ ] **UI Fallback Safety**: do not derive display names from `account_id` fragments.
> 9. [ ] **Matchmaking v4.2**: `playClient.newMatchmakingClient(appId)` + manual `session_id`.
> 10. [ ] **Session Match**: local `actor_id` is resolved by matching `session_id` in actor list.
> 11. [ ] **Event Resiliency**: Play SDK `MatchmakingClient` or `Room` may not support `.on()`; use `addEventListener` or explicit property-safe event delegates.

## 1. Auth Resilience (Canonical)

- **SDK Source**: Use the official UMD bundle at `https://www.viverse.com/static-assets/viverse-sdk/index.umd.cjs`.
- **SDK Detection**: Implement a retry loop (every 200ms for up to 30s) against all supported globals (`window.vSdk`, `window.viverse`, `window.VIVERSE_SDK`). Provide a "Reload" fallback UI if detection fails.
- **Handshake Timing**:
    - A 1200ms delay after SDK detection is mandatory.
    - Check `sdk.bridge?.isReady` before the first `checkAuth()`.
- **Profile Fetch**: 
    - **Strategy 0 (Instant)**: Extract `user_name` and `picture` directly from the `checkAuth()` result object. Use these as immediate UI fallbacks.
    - **Strategy 1 (Full Profile)**: Wait 2000ms after `checkAuth()` for Avatar SDK initialization.
    - **Shotgun Constructor**: `new vSdk.avatar({ baseURL: "https://sdk-api.viverse.com/", accessToken: token, token: token, authorization: token })`.
    - Primary path: `avatar.getProfile()`.
    - Fallback path: `client.getUserInfo()` -> `client.getUser()` -> `client.getProfileByToken(token)`.
- **Avatar Normalization**: To pass the `auth-avatar-field-normalization` gate, check for the following fields in order: `picture`, `headIconUrl`, `head_icon_url`, `avatar_url`, `snapshot_url`, `thumbnail_url`.

## 2. Matchmaking & Multiplayer (v4.2 Standards)

- **Constructor**: ALWAYS use `playClient.newMatchmakingClient(appId)`.
- **Manual Identity**: Generate `actorSessionId` using `${userId}-${timestamp}` for `session_id`.
- **Session-Matching**: To find your `actor_id`, iterate `mc.getMyRoomActors()` or `room.actors` and match the `session_id`.
- **Actor ID Reliability**: Implement a retry loop (e.g., 10x with 200ms intervals) in `onConnect` to ensure `room.getMyActor()` returns a valid actor. Use null-safe fallbacks (e.g., `(id || '').slice(-4)`) for ID operations.
- **Dealer Pattern**: First actor in `mc.getActorList()` initializes the game state to prevent race conditions.
- **Resilient Event Pattern**: If `.on()` is missing on the client, use:
  ```javascript
  if (client.on) client.on('event', cb);
  else if (client.addEventListener) client.addEventListener('event', cb);
  ```
- **setActor Compatibility Guard**: Never call `mc.setActor(...)` blindly. Use `mc.setActor?.(...)` or explicit method checks and fail with a clear error when unavailable.
- **Room ID Hard Guard**: Before `new MultiplayerClient(roomId, ...)`, normalize from `room.id || room.roomId || room.game_session`; if empty, throw `Error("roomId is required")` and stop scene init.

## 3. Build & Deployment (Grep Gate)

- **Grep Gate**: `grep -r "YOUR_APP_ID" dist/assets/` MUST match the intended World ID.
- **Traceability**: Log a `VERSION_NAME` (e.g., `1.5.0-resilience-fix`) on startup in EVERY file.
- **Publish Path**: Ensure `viverse-cli app publish` points to the compiled `dist` directory.

---
**Canonical rule**: keep one auth/profile recipe across all projects to prevent agent drift and repeated regression loops.
