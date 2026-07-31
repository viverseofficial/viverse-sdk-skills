---
name: viverse-avatar-me-sdk
description: "Integrate the standalone VIVERSE Avatar Me SDK into websites, games, and Three.js experiences. Use when implementing SDK Happy Path, Host Sign In, avatar creation or selection events, panel customization, signed avatar URL handling, VRMA animations, or the Avatar Controller."
argument-hint: "Describe the VIVERSE Avatar integration you want to build or debug"
---

# VIVERSE Avatar SDK

Use this skill to build or troubleshoot a third-party integration with the public VIVERSE Avatar SDK.

## Source Of Truth

The current public documentation is [VIVERSE Avatar SDK Guide](https://me-stage.viverse.com/sdk/guide). Check it when network access is available, especially before relying on option names, defaults, payload fields, or security requirements. The bundled references are an offline snapshot and may be older than the hosted guide.

## Integration Workflow

1. At the start, ask the user which of these they want, and offer the first as the default:
   1. **Tier A free-design game** — a brand-new standalone Three.js game where you have creative latitude over theme, environment dressing, HUD, objectives, and gameplay, built on top of the Tier A Avatar Controller and the required completion standard. Stay inside the SDK and Tier A boundaries (see [Tier A Free-Design Game](#tier-a-free-design-game)).
   2. **Tier A standard avatar sandbox** — a brand-new standalone single-avatar scene on a flat ground plane with the bundled controller and no added gameplay.
   3. **Integration into the current workspace / existing scene** — inspect the existing project and choose Selection-Only or Tier B (`physics: 'none'`); do not scaffold a new game or overwrite the host's scene, renderer, controls, or animation loop.

   Only build a complete new game (option 1 or 2, Tier A) when the user explicitly wants a standalone one.
2. Ask which entry points the host wants, and offer the first as the default:
   1. **Start** — players go straight to creating their own character or choosing a preset character, with no sign-in needed.
   2. **Host Sign In** — external host identity only (`data-ac3-show-anonymous-button="false"`).
   3. **Start + Host Sign In** — both entry buttons.

   In all three, always keep the in-panel `Use VIVERSE Avatar Library` button (SDK default `showLibraryButton: true`); do not disable it. Tell the user it is included by default and that they can remove it themselves with `happyPath.auth.showLibraryButton: false` (`data-ac3-hp-show-library-button="false"`).
3. At the start, ask the user to paste the ready-made SDK Code Snippet they copied from VIVERSE Avatar (Account Settings -> My SDK). Extract the SDK Integration ID from it. If the user does not have a snippet yet, tell them to sign in, open Account Settings -> My SDK, and use Copy in the SDK Code Snippet box, then continue with the `partner_...` placeholder.
4. At the start, also confirm the user has added every host's exact `window.location.origin` under Allowed Websites in Account Settings -> My SDK. If not, ask them to add it there before the integration can authorize (each entry is an exact origin with no path, query, hash, wildcard, or trailing route; localhost origins must be added explicitly).
5. Use `https://me-stage.viverse.com/sdk.js` with `mode: 'sdk-happy-path'`. Never copy a real integration ID into generated examples; use `partner_...` unless the user supplies one from their snippet.
6. For a new Three.js game without existing physics, default to the bundled Avatar Controller with `physics: 'builtin'`; do not hand-roll movement, orbit, zoom, jump, joystick, or VRMA state transitions.
7. Load the VRM with `GLTFLoader` + `VRMLoaderPlugin`, clean it with `VRMUtils`, and pass both the VRM and `avatar.animations` to `controller.setAvatar()`.
8. Apply `avatar.controlsHint` and later `viverse-me:controls-changed` payloads through `setEnableAnimation()`, `setEnableControl()`, and `setControllerSize()`.
9. Pause rendering and hide controller UI on `viverse-me:open`; resume and restore eligible controls on `viverse-me:close`. Show touch controls only after an avatar is loaded and the SDK panel is closed.
10. Give the host its own entry panel that mounts the launch button. Hide it on `viverse-me:avatar-selected`, restore it if the avatar fails to load, and restore it on `viverse-me:auth-cleared` when `detail.identityType !== 'viverse'`. Do not build a host confirm or "enter" button — the SDK Happy Path panel owns the `Enter Game` confirmation and dispatches `viverse-me:avatar-selected` when the user clicks it.
11. Use `vrmUrl` and `thumbnailUrl` only for immediate preview. Persist stable references such as `partnerId`, `tenantId`, `key`, and a stable host subject instead of signed URLs.
12. Validate authorization failure, expired signed URLs, cleared browser storage, host-page CSP (including `blob:` in `connect-src` and `img-src` so `GLTFLoader` can read the VRM's embedded textures), resize, WebGL lifecycle, avatar replacement/disposal, and mobile controls.

## Three.js Completion Standard

When asked to build a complete Three.js avatar game or experience, do not stop at the minimal selection listener below. The result is complete only when it includes:

- The documented shared import map for Three.js, `@pixiv/three-vrm`, and `@pixiv/three-vrm-animation`.
- A host-owned scene, renderer, lights, resize handling, `GLTFLoader`, and one animation loop with a clamped delta.
- The SDK-owned Avatar Controller using `window.ViverseMeSDK.avatarControllerUrl` and `window.ViverseMeSDK.animations`.
- Happy Path selection, VRM replacement and disposal, payload animation overrides, control-hint synchronization, SDK open/close pause behavior, and touch-control visibility.
- A host entry panel that mounts the launch button, hides on `viverse-me:avatar-selected`, restores on avatar load failure, and restores on `viverse-me:auth-cleared` when `detail.identityType !== 'viverse'`. Do not add a host-side confirm or "enter game" button; the SDK Happy Path panel owns the `Enter Game` confirmation.
- A loading state and an error path that leave the previous avatar usable when a replacement fails.
- For a Tier A free-design game, a transparent selection overlay so the live game scene stays visible behind the picker. This is required, not optional: the SDK's default overlay is a translucent-white `backdrop-filter: blur(8px)` sheet, so the embed must set `overlayBackground: 'transparent'` and `overlayBackdropFilter: 'none'` (`data-ac3-hp-overlay-background="transparent"` / `data-ac3-hp-overlay-backdrop-filter="none"`). Treat the game as incomplete if the picker still shows the default frosted/white background.

Use Tier B (`physics: 'none'`) only when the host already owns physics, collision, camera, movement, or control UI. In Tier B, keep Happy Path selection and VRMA loading, but do not let the controller own world movement or vertical position.

## Tier A Free-Design Game

When the user picks the Tier A free-design game option, treat it as a real game brief: you have creative latitude over the concept, but every SDK and Tier A rule below still applies.

- Meet the full Three.js Completion Standard above first. Free design is layered on top of a correct integration, never a replacement for it.
- The bundled Avatar Controller with `physics: 'builtin'` still owns movement, orbit/zoom, jump, and `position.y` on a single flat ground plane. Do not hand-roll locomotion, camera, or jump, and do not fight the controller for control of the avatar.
- Creative latitude covers theme, lighting and skybox mood, static decorative props and environment set-dressing, HUD/UI, objectives, collectibles, timers, scoring, audio, and non-blocking NPC or trigger volumes that read the avatar's position from the controller getters.
- Required: give the Happy Path picker a transparent overlay so the live game scene stays visible behind it. The SDK's built-in default overlay is a translucent-white `backdrop-filter: blur(8px)` sheet, so you must override it every time with the allowlisted theme options `overlayBackground: 'transparent'` and `overlayBackdropFilter: 'none'` (script attributes `data-ac3-hp-overlay-background="transparent"` and `data-ac3-hp-overlay-backdrop-filter="none"`). Keep the picker card itself readable (`panelBackground`); only the full-screen overlay/backdrop-blur behind the card becomes see-through. A free-design game that still shows the default frosted/white background is not complete.
- Keep gameplay compatible with flat-ground movement. Do not add world collision, slopes, stairs, platforms, multi-floor levels, or anything that needs the controller to change vertical position or resolve collisions.
- If the game concept requires collision, platforms, multi-floor levels, or a host-owned camera/physics, switch to Tier B (`physics: 'none'`) and own movement and collision on the host side. Do not bolt collision onto Tier A.
- Do not place props, triggers, or UI that block the avatar spawn area, the launch button slot, or the SDK selection panel.
- All Security Boundaries below still apply: no partner tokens or backend secrets in the browser, no direct account/draft/upload/download-url calls, and signed asset URLs remain expiring preview transport only.

## Selection-Only Integration

This is appropriate when an existing host scene already owns VRM loading, animation, controls, lifecycle, and disposal. It is not a complete Three.js game setup.

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
<script>
  window.addEventListener('viverse-me:avatar-selected', (event) => {
    const avatar = event.detail.avatar;
    hostScene.loadAvatar(avatar.vrmUrl, {
      animations: avatar.animations,
      controlsHint: avatar.controlsHint
    });
    partnerApi.saveSelectedAvatarReference({
      partnerId: avatar.partnerId,
      userId: avatar.userId,
      tenantId: avatar.tenantId,
      key: avatar.key
    });
  });
</script>
```

## Security Boundaries

- Do not expose `PARTNER_API_TOKEN`, admin tokens, or backend secrets in browser code.
- Do not call account, draft, upload, claim, or `/api/ac3/download-url` routes directly from the third-party host page. The embedded SDK owns those flows.
- Allow `https://me-stage.viverse.com` in the host's `frame-src` and `connect-src` CSP. Three.js hosts also need `blob:` in `connect-src` and `img-src` because `GLTFLoader` reads embedded VRM textures as Blob URLs, plus any import-map CDN origins in `connect-src`/`script-src`. The SDK iframe has its own CSP that the host cannot change.
- Treat signed asset URLs as expiring preview transport.
- Verify host identities with the partner's own authentication system before calling `openWithHostSignIn()`.
- Do not assume anonymous avatars merge into a Host Sign In account; those storage identities are independent.

## Choose References

- For initialization, authorization, Host Sign In, events, payloads, panel options, and backend restoration, read [SDK integration reference](./references/sdk-integration.md).
- For VRMA clips, integration tiers, Three.js peer dependencies, physics, camera, movement, and jump behavior, read [Avatar Controller reference](./references/avatar-controller.md).
