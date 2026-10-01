# Verification recipes

## Use a dedicated headless Chromium

A tab opened by an IDE/browser tool can be `document.visibilityState === 'hidden'`, which pauses `requestAnimationFrame` and leaves screenshots stale. Launch your own browser:

```js
import { chromium } from 'playwright';
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', m => /\[Village\]|rror/i.test(m.text()) && console.log(m.text()));
page.on('pageerror', e => console.log('pageerror', e.message));
```

Software GL is slow and the SDK decodes on the main thread, so a page can be unresponsive for 10+ seconds. `page.evaluate` sampling then returns in bursts; use a `MutationObserver` inside the page to record every overlay text change with timestamps instead of polling.

## Framing screenshots

- Add a **temporary** global (for example `globalThis.__TMP_SCENE__ = this`) to set camera and target, and set the game's "user override" flag so its per-frame framing does not undo you. Remove it before committing and grep to prove it is gone.
- Useful views: top-down overview (`pos [0, 78, 34]`, `target [0, 0, -14]`), the player's default camera, each cardinal sector, a portrait viewport (500x900).
- Hide HUD panels with an injected style for clean scenery shots.

## The four loading cases

| Case | How | Expect |
|---|---|---|
| Normal start | New game on a fresh page | overlay "0 / N", then gone, countdown starts after |
| Layout not loaded yet | Jump straight to a stage that uses the other layout | overlay shows for that layout only |
| Stalled streaming | Block the stream host (below) | overlay stays until the timeout, then the stage starts; log says N buildings still streaming |
| Failed assets | Block service workers, or return errors | every building fails, gate settles immediately, game starts |

### Stalling the stream host

`context.route(/stream\.viverse\.com/, () => {})` never answers, but the PLS service worker fetches the models, and Playwright does not see service-worker traffic by default. Start Node with:

```bash
PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1 node verify.mjs
```

Without it the route is bypassed and the models load normally, so a "stall" test passes for the wrong reason (the overlay closes after a few seconds).

`serviceWorkers: 'block'` is **not** a stall. The SDK throws (`Cannot read properties of undefined (reading 'scope')`) and every building fails fast: that exercises the failure path, not the timeout.

## Asset availability before any browser work

```bash
# HEAD is enough for existence and size; 200 expected
curl -sI "<streamUrl>model.xrg" | head -3
# the bare folder URL returns 403 and that is normal
curl -s -o /dev/null -w "%{http_code}\n" "<streamUrl>"
```

Run the HEAD check for every asset in the layout (in parallel) before any browser work and report any that fail.

## Regression guard

Run the project's full test suite and a production build after the change. In the reference game that was 573 tests and a Vite build. New tests covered layout geometry, the readiness API, the gate, the overlay and translations.
