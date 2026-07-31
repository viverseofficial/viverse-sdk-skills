# SDK Integration Reference

## Setup And Authorization

- Public entry: `https://me-stage.viverse.com/sdk.js`
- Public mode: `sdk-happy-path`
- Obtain the ready-made snippet from VIVERSE Avatar: Account Settings -> My SDK. Before generating integration code, ask the user to paste this snippet so the SDK Integration ID can be extracted; fall back to the `partner_...` placeholder only when they have not copied one yet.
- Add every host as an exact Allowed Website origin. Do not include paths, query strings, hashes, wildcards, credentials, or trailing application routes. Confirm at the start that the host origin is already added under Allowed Websites (Account Settings -> My SDK), otherwise `init()` cannot authorize.
- If authorization fails, `ViverseMeSDK.init()` resolves to `null`, no iframe UI is created, and `viverse-me:authorization-denied` fires.
- Localhost origins are supported when explicitly added to Allowed Websites.

Required host CSP:

```text
frame-src https://me-stage.viverse.com
```

Three.js hosts that load the selected VRM with `GLTFLoader` also need, in the host page CSP:

- `connect-src` must include `blob:` — `GLTFLoader` reads the VRM's embedded textures through generated Blob URLs, so a missing `blob:` allowance loads the mesh geometry without materials.
- `connect-src` must include `https://me-stage.viverse.com` for signed VRM and thumbnail fetches, the Avatar Controller module, and VRMA animations.
- `img-src` must include `blob:` and `data:` for textures and thumbnails.
- `script-src` and `connect-src` must include the import-map CDN origins, for example `https://unpkg.com` and `https://esm.sh`.

The SDK iframe has its own separate CSP that the host cannot change; only the host page CSP needs these allowances.

Roboto button parity additionally needs `style-src https://fonts.googleapis.com` and `font-src https://fonts.gstatic.com`.

## Script Attributes And Init Options

| Script attribute | Init option | Purpose |
| --- | --- | --- |
| `data-ac3-mode` | `mode` | Use `sdk-happy-path`. |
| `data-ac3-target` | `target` | Launch button slot selector. |
| `data-ac3-partner-id` | `partnerId` | Required SDK Integration ID. |
| `data-ac3-user-id` | `userId` | Stable host user ID; recommended in production. |
| `data-ac3-session-id` | `sessionId` | Optional host session ID. |
| `data-ac3-character-id` | `characterId` | Optional host character ID. |
| `data-ac3-locale` | `locale` | Embedded locale; default `en-US`. |
| `data-ac3-label` | `label` | Anonymous launch button label. |
| `data-ac3-button-class` | `buttonClass` | Class added to the launch button. |
| `data-ac3-show-anonymous-button` | `showAnonymousButton` | Set `false` to hide Start. |
| `data-ac3-host-sign-in-target` | `hostSignInTarget` | Host Sign In button slot selector. |
| `data-ac3-host-sign-in-label` | `hostSignInLabel` | Host Sign In label. |
| `data-ac3-host-sign-in-button-class` | `hostSignInButtonClass` | Class added to Host Sign In. |
| `data-ac3-remember-host-sign-in` | `rememberHostSignIn` | Request an existing verified host identity. |
| `data-ac3-auto-init` | n/a | Set `false` for manual init. |

Provide at least one stable host subject field in production, usually `userId`.

## Happy Path Behavior

- Anonymous users can choose public defaults, create avatars, restore same-browser saved avatars, and delete saved avatars.
- The SDK stores an opaque anonymous ID in host `localStorage`. Clearing site data or changing browser/device breaks that anonymous link.
- Anonymous creation uses developer-owned storage and is capped at the account avatar limit, currently 8 by default.
- `Use VIVERSE Avatar Library` is shown in the panel by default (`showLibraryButton: true`) and switches the panel into the end user's authenticated library. Keep it on for every entry layout and tell the host it is included by default; they can remove it themselves with `happyPath.auth.showLibraryButton: false` (`data-ac3-hp-show-library-button="false"`).
- On mobile creation, the embedded flow releases Unity before restoring a thumbnail-only viewer and generating the thumbnail.

For games and interactive Three.js experiences, Happy Path is the required selection surface. Keep the host scene mounted behind it, pause the host render/input workload while the SDK is open, and load the selected avatar only from `viverse-me:avatar-selected`.

## Host Sign In

Keep anonymous Start and Host Sign In as separate identities. Handle the SDK event with the partner's real authentication UI, verify the account, and then open the SDK:

```js
window.addEventListener('viverse-me:sdk-ready', (event) => {
  const sdk = event.detail.instance;

  window.addEventListener('viverse-me:host-sign-in-click', () => {
    hostSignInDialog.hidden = false;
  });

  window.addEventListener('viverse-me:host-identity-request', (identityEvent) => {
    identityEvent.detail.respond(hostAuth.currentUserId || '');
  });

  hostSignInForm.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    await sdk.openWithHostSignIn(hostAuth.currentUserId);
  });
});
```

Never trust a free-form browser field as the production identity.

### Entry combinations

Ask which entry points the host wants and offer the first as the default: **Start** (anonymous only), **Host Sign In** (external identity only), or **Start + Host Sign In** (both). The same script supports all three layouts by adding or removing attributes. In every layout, keep the in-panel `Use VIVERSE Avatar Library` button (default on) and tell the host they can remove it with `data-ac3-hp-show-library-button="false"`.

Start (anonymous only; omit the Host Sign In slot and attribute):

```html
<div id="viverse-me-button-slot"></div>
<script
  src="https://me-stage.viverse.com/sdk.js"
  data-ac3-mode="sdk-happy-path"
  data-ac3-target="#viverse-me-button-slot"
  data-ac3-partner-id="partner_..."
  data-ac3-label="Start"
  async
></script>
```

Host Sign In only (set `data-ac3-show-anonymous-button="false"`):

```html
<div id="host-sign-in-button-slot"></div>
<script
  src="https://me-stage.viverse.com/sdk.js"
  data-ac3-mode="sdk-happy-path"
  data-ac3-host-sign-in-target="#host-sign-in-button-slot"
  data-ac3-show-anonymous-button="false"
  data-ac3-partner-id="partner_..."
  async
></script>
```

Start + Host Sign In (both slots):

```html
<div id="viverse-me-button-slot"></div>
<div id="host-sign-in-button-slot"></div>
<script
  src="https://me-stage.viverse.com/sdk.js"
  data-ac3-mode="sdk-happy-path"
  data-ac3-target="#viverse-me-button-slot"
  data-ac3-host-sign-in-target="#host-sign-in-button-slot"
  data-ac3-partner-id="partner_..."
  data-ac3-label="Start"
  async
></script>
```

## Manual Initialization

Set `data-ac3-auto-init="false"`, wait for the script to load, and call:

```js
const instance = await window.ViverseMeSDK.init({
  mode: 'sdk-happy-path',
  target: '#viverse-me-button-slot',
  partnerId: 'partner_...',
  userId: 'host-user-123',
  locale: 'en-US',
  onOpen() { hostScene.pause(); },
  onClose() { hostScene.resume(); },
  onAvatarSelected(event) { hostScene.loadAvatar(event.avatar.vrmUrl); },
  onAuthCleared() { hostScene.clearSelectedAvatar(); },
  onAuthorizationDenied(event) { console.warn(event.message); }
});
```

Instance methods: `open()`, `close()`, `openWithHostSignIn(account)`, and `destroy()`.

## Interactive Host Lifecycle

Use these events together rather than implementing only avatar selection:

```js
let pausedBySdk = false;
let hasAvatar = false;

window.addEventListener('viverse-me:open', () => {
  pausedBySdk = true;
  hostScene.pause();
  hostScene.setJoystickVisible(false);
});

window.addEventListener('viverse-me:close', () => {
  pausedBySdk = false;
  hostScene.resume();
  hostScene.setJoystickVisible(hasAvatar);
});

window.addEventListener('viverse-me:avatar-selected', async (event) => {
  const avatar = event.detail.avatar;
  await hostScene.replaceAvatar(avatar.vrmUrl, avatar.animations);
  hasAvatar = true;
  hostScene.applyControls(avatar.controlsHint, { pausedBySdk });
  hostScene.setJoystickVisible(!pausedBySdk);
});

window.addEventListener('viverse-me:controls-changed', (event) => {
  hostScene.applyControls(event.detail.controls || event.detail, { pausedBySdk });
});
```

- `viverse-me:open`: stop the animation frame loop where practical, disable controller input, hide joystick/Jump UI, and pause audio or expensive simulation.
- `viverse-me:close`: reset the clock delta before restarting, restore input according to the latest control state, and show touch controls only if an avatar is loaded.
- `viverse-me:avatar-selected`: use `avatar.vrmUrl` immediately, pass `avatar.animations` to the controller, and apply `avatar.controlsHint`.
- `viverse-me:controls-changed`: accept either `event.detail.controls` or the flattened `event.detail` payload.
- During avatar replacement, keep the previous avatar until the new GLTF has loaded and validated; detach and deep-dispose the old VRM before attaching the replacement.

### Host Entry Panel

The host owns the entry panel that mounts the launch button (and any Host Sign In button). The SDK owns avatar confirmation: the Happy Path panel shows its own `Enter Game` button after a card is picked, and clicking it dispatches `viverse-me:avatar-selected`. Do not build a host-side confirm or "enter" button.

- Show the entry panel first, with the launch button slot mounted inside it.
- On `viverse-me:avatar-selected`, hide the entry panel and enter the experience; restore it if the avatar fails to load.
- On `viverse-me:auth-cleared`, restore the entry panel unless a VIVERSE identity is still active (`detail.identityType !== 'viverse'`).
- Show touch controls only after an avatar is loaded and the SDK panel is closed.

```js
const entryPanel = document.querySelector('.host-entry-panel');
let hasAvatar = false;

window.addEventListener('viverse-me:avatar-selected', async (event) => {
  entryPanel.hidden = true;
  try {
    await hostScene.replaceAvatar(event.detail.avatar.vrmUrl, event.detail.avatar.animations);
    hasAvatar = true;
  } catch (error) {
    if (!hasAvatar) entryPanel.hidden = false;
  }
});

window.addEventListener('viverse-me:auth-cleared', (event) => {
  if (event.detail.identityType !== 'viverse') entryPanel.hidden = false;
});
```

## Events

| Event | Important payload |
| --- | --- |
| `viverse-me:sdk-ready` | `{ instance }` |
| `viverse-me:open` | SDK state details |
| `viverse-me:close` | SDK state details |
| `viverse-me:avatar-selected` | `{ avatar }`, plus animations and control hints |
| `viverse-me:controls-changed` | `{ animationEnabled, controlEnabled, controllerSize }` |
| `viverse-me:selector-state` | `{ mode, collapsed, placement, expanded }` |
| `viverse-me:host-sign-in-click` | `{ instance, button }` |
| `viverse-me:host-identity-request` | `{ instance, respond }` |
| `viverse-me:auth-cleared` | SDK state details; may include `identityType` |
| `viverse-me:authorization-denied` | `partnerId`, `origin`, `code`, `message` |

## Avatar Payload And URL Lifecycle

A selection can include `tenantId`, `key`, `fileName`, `partnerId`, host subject fields, `vrmUrl`, `thumbnailUrl`, expiry timestamps, animation URLs, and control hints.

- Render `vrmUrl` and `thumbnailUrl` immediately, but do not store them as durable URLs.
- Store stable references (`partnerId`, host subject, `tenantId`, `key`).
- Resolve a fresh active avatar server-side through:

```http
GET https://me-stage.viverse.com/api/ac3/partner/active-avatar?partnerId=partner_...&userId=host-user-123
Authorization: Bearer <PARTNER_API_TOKEN>
```

Keep `PARTNER_API_TOKEN` on the backend only.

When manually building `/api/ac3/sdk/default-avatar`, include `partnerId`, `origin=window.location.origin`, and `file`; image requests may omit the `Origin` header.

## Panel Customization

Customization is allowlisted and sanitized. Do not attempt to inject arbitrary CSS, HTML, JavaScript, or stylesheet URLs.

```js
happyPath: {
  cards: {
    showSavedAvatar: true,
    showDefaultAvatars: true,
    showCreateAvatar: true,
    savedAvatarFetchLimit: 3,
    savedAvatarDisplayLimit: 2
  },
  auth: { showLibraryButton: true },
  layout: { maxVisibleRowsBeforeScroll: 2, disableDynamicPanelWidth: false },
  copy: { title: 'Choose a character', createLabel: 'Create' },
  theme: {
    overlayBackground: 'transparent',
    overlayBackdropFilter: 'none',
    panelBackground: 'rgba(255, 255, 255, 0.92)',
    titleColor: '#0f172a',
    cardBackground: 'rgba(16, 24, 40, 0.82)'
  }
}
```

Supported groups include `copy`, `cards`, `auth`, `layout`, and `theme`. Theme options cover font, overlay, panel, title/subtitle, cards, grid, close button, and create icon. Happy Path supports vertical grid overflow only.

The modal overlay is the full-screen layer behind the picker card. It defaults to a translucent tint plus `backdrop-filter: blur(8px)`, which frosts whatever is behind it. To keep a live game scene visible behind the picker, set `theme.overlayBackground: 'transparent'` and `theme.overlayBackdropFilter: 'none'` (`data-ac3-hp-overlay-background` / `data-ac3-hp-overlay-backdrop-filter`); the picker card stays controlled separately by `panelBackground`.

## Troubleshooting

- `init()` returns `null`: verify `partnerId` and exact Allowed Website origin.
- Saved avatar missing: the anonymous ID may be absent or browser storage may have been cleared.
- Cached URL stopped loading: signed URLs expire; request a new selection or resolve the active avatar server-side.
- Default thumbnail returns `SDK_ORIGIN_REQUIRED`: add the current host `origin` query parameter.
- Avatar loads but has no textures/materials: the host page CSP `connect-src` is blocking `blob:`. `GLTFLoader` fetches the VRM's embedded textures through Blob URLs; add `blob:` to `connect-src` (and `img-src`). The SDK iframe CSP is separate and cannot be changed by the host.
