---
name: viverse-i18n
description: Detect the user's language in a VIVERSE-hosted game and render localized text. Covers the _htc_lang_code cookie, URL param fallback, navigator.language fallback, and a minimal t() translation system.
prerequisites: [VIVERSE-hosted game (iframe), browser DOM]
tags: [viverse, i18n, localization, language, translation]
---

# VIVERSE i18n — Language Detection & Localization

VIVERSE stores the user's chosen language in a cookie. Read it at startup to auto-select the correct locale.

## When To Use This Skill

- Any VIVERSE-hosted game/app that displays text
- Translating UI labels, weapon names, banners, hints
- Auto-adapting to the language set in the VIVERSE header

---

## Language Cookie

VIVERSE sets the user's language preference in:

```
Cookie name: _htc_lang_code
Example values: zh-TW, zh-CN, ja, ko-KR, es-ES, en-US
```

This cookie is available to the embedded iframe (same `viverse.com` domain).

---

## Detection Priority

Always check in this order:

1. `_htc_lang_code` cookie  ← VIVERSE user preference
2. `?lang=` URL query param ← manual / testing override
3. `navigator.language`     ← OS/browser fallback

```js
function _getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

function detectLocale() {
  const cookieLang =
    _getCookie('_htc_lang_code') ||
    _getCookie('lang') ||
    _getCookie('language') ||
    _getCookie('locale');
  const urlLang = new URLSearchParams(window.location.search).get('lang') || '';
  const raw = (cookieLang || urlLang || navigator.language || 'en').toLowerCase();

  // zh-CN / zh-SG → Simplified Chinese
  if (raw === 'zh-cn' || raw === 'zh-sg' || raw === 'zh-hans') return 'zh-cn';
  // zh-TW, zh-HK, zh-* → Traditional Chinese
  if (raw.startsWith('zh')) return 'zh';
  if (raw.startsWith('ja')) return 'ja';
  if (raw.startsWith('ko')) return 'ko';
  if (raw.startsWith('es')) return 'es';
  return 'en'; // default
}

const _locale = detectLocale(); // called once at module load
```

> **Important**: `_locale` is set once at page load. Changing the VIVERSE language setting takes effect after a **full page reload**.

---

## Minimal t() Translation System

```js
const LOCALES = {
  en: {
    'ui.btn.continue': 'Continue',
    'ui.btn.newGame':  'New Game',
    // ... all keys
  },
  zh: {
    'ui.btn.continue': '繼續遊戲',
    'ui.btn.newGame':  '新遊戲',
  },
  'zh-cn': {
    'ui.btn.continue': '继续游戏',
    'ui.btn.newGame':  '新游戏',
  },
  ja: { /* ... */ },
  ko: { /* ... */ },
  es: { /* ... */ },
};

export function t(key, vars = {}) {
  const strings = LOCALES[_locale] || LOCALES.en;
  let str = strings[key] ?? LOCALES.en[key] ?? key; // always falls back to EN, then key
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}
```

Variable substitution example:
```js
// Key: 'wave.cleared': '✅ Wave {wave}/{total} — Upgrade!'
t('wave.cleared', { wave: 3, total: 5 })
// → '✅ Wave 3/5 — Upgrade!'
```

---

## Dynamic Keys (e.g. weapon names)

For objects with IDs, use a helper that looks up the locale map directly (avoids returning the raw key string when missing):

```js
export function weaponLabel(id, fallback = '') {
  const key = `weapon.${id}.label`;
  const strings = LOCALES[_locale] || LOCALES.en;
  return strings[key] ?? LOCALES.en[key] ?? fallback;
}

export function weaponDesc(id, fallback = '') {
  const key = `weapon.${id}.desc`;
  const strings = LOCALES[_locale] || LOCALES.en;
  return strings[key] ?? LOCALES.en[key] ?? fallback;
}
```

> **Gotcha**: Do NOT use `t(key) || fallback`. The `t()` function returns the raw key string when a key is missing — which is truthy — so the fallback never fires. Always check the locale map directly when a fallback matters.

---

## Supported Locales

| Cookie / navigator value | Detected locale | Notes |
|---|---|---|
| `zh-TW`, `zh-HK`, `zh-*` | `zh` | Traditional Chinese |
| `zh-CN`, `zh-SG`, `zh-Hans` | `zh-cn` | Simplified Chinese |
| `ja`, `ja-JP` | `ja` | Japanese |
| `ko`, `ko-KR` | `ko` | Korean |
| `es`, `es-*` | `es` | Spanish |
| anything else | `en` | English (default) |

---

## Key Naming Convention

Use dot-notation with consistent namespacing:

```
ui.*          — general UI elements (buttons, labels, tabs)
shop.*        — shop/armory screen strings
hint.*        — wave intro hints
threat.*      — enemy type labels
boss.*        — boss names
ability.*     — player ability names and banners
save.*        — save/restore notification messages
wave.*        — wave clear banners
cta.*         — call-to-action prompts
weapon.<id>.label   — weapon display name (emoji + name)
weapon.<id>.desc    — weapon description text
weapon.upgrade.desc — upgrade card description (supports {next} variable)
```

---

## Gotchas

1. **Cookie not accessible in iframes on different domains** — VIVERSE embeds your game on the same `viverse.com` domain, so the cookie IS accessible. If testing locally (`localhost`), the cookie won't be set — use the `?lang=` URL param to test translations.

2. **Module-level constant** — `_locale` is frozen at page load. Never try to re-detect mid-session.

3. **Always provide English keys** — `t()` falls back to `LOCALES.en` before returning the raw key. If a key is missing from both the target locale AND English, the raw key string is returned (which will appear as `weapon.siege_cannon.label` in the UI).

4. **Weapon objects cloned at runtime** — Weapon `label` field on cloned slot objects reflects the value at clone time (English). Always call `weaponLabel(w.id, w.label)` at render time, not at clone time.
