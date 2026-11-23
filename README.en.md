<div align="center">

# dsh-skin · Visual Baseline 「视觉基座」

**A visual baseline for DSH that only overrides the official `--dsw-*` theme tokens: brand colors, radii, shadows, selection and scrollbars — no component class names, no forks, nothing injected beyond one `<style>` element.**

Because it touches only documented extension points, a DSH upgrade rarely breaks it; if one does, the colors fall back to the defaults instead of taking the service down.

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/DSH-DeepSeek%20Harness-5b5ef7)](https://github.com/frankfurtlin/dsh-pocket)

[中文](README.md) · [English](README.en.md)

</div>

## What it is

dsh-skin restyles DSH entirely through its theme tokens. DSH's theme system currently exposes 403 `--dsw-*` tokens, with light values defined on `:root` and dark values on `body[data-ds-dark-theme]`. The plugin maps a small brand palette — accent, selection strength, radius step, shadow tint — onto the tokens it cares about (17 of them), and scopes the two remaining rules (selection and focus ring) to its own `html[data-dsh-skin]` attribute.

It is a pure client-side visual layer: no data, no storage, no network calls, and no routes beyond a read-only `/skin/status` for self-checking.

## Features

- **One brand palette for both themes** — light accent `#3b6fe0`, dark accent `#7aa2ff`; link, focus ring and selected state all follow the accent.
- **Softer geometry** — a `+2px` step applied to six official radius tokens (`xs` through `panel`).
- **Lighter shadows** — three shadow levels redefined with a configurable slate tint, plus accent-tinted scrollbars.
- **Four tuning variables** — `--skin-accent`, `--skin-accent-soft`, `--skin-radius-step`, `--skin-shadow-slate`, all at the top of `styles/skin.css`.
- **Upgrade-safe by construction** — no selectors that depend on someone else's class names; the build and the tests fail before the stylesheet can silently rot.
- **Desktop first, mobile neutral** — the ≤1023px media block is a deliberate no-op that marks the boundary; it adds no layout rules, so `dsh-mobile-ux` keeps owning layout.
- **Self-check built in** — `GET /skin/status` reports version, client bundle size and the number of tokens covered; `__dshSkin.status()` / `__dshSkin.remount()` do the same from the browser console.
- **Real-browser verification** — `scripts/verify-ui.mjs` runs 13 assertions in headless Chromium with before/after screenshots.

## Why tokens instead of CSS overrides

Writing `[class*="xxx"]` selectors against component internals is the most common way this kind of plugin dies: every DSH frontend refactor breaks it, usually silently. Overriding documented tokens is the supported customisation path. Two gates turn that failure mode into a failing build instead:

- `scripts/build.mjs` checks that every `--dsw-*` name used in the stylesheet exists in the installed DSH `dsh-client-ui-theme/lib/client.js`;
- `test/skin.test.mjs` asserts the stylesheet never selects on `class=` / `class*=`.

## Install

```bash
# 1) Mount the plugin into the profile (pnpm reinstalls profile dependencies;
#    dsh-post-install-repair.path patches things up afterwards)
dsh plugin --profile web add /root/workspace/plugins/dsh-skin
# then add "dsh-skin" to dsh.profile.bundles in the profile's package.json

# 2) Restart the service (client bundles are assembled by the host; refresh the browser after)
systemctl restart deepseek-harness.service

# 3) Self-check
curl -s http://127.0.0.1:3080/skin/status
# {"plugin":"dsh-skin","version":"0.1.0","clientBytes":7914,...,"tokens":17}
```

## Configuration

There is no config file. `styles/skin.css` is the single source of truth, and the four variables at its top are the only knobs there are:

```css
--skin-accent: #3b6fe0;          /* accent: links, focus ring, selected state */
--skin-accent-soft: 24%;         /* strength of the selected background */
--skin-radius-step: 2px;         /* added to every radius token */
--skin-shadow-slate: 15 23 42;   /* rgb components of the shadow tint */
```

The dark-theme values live in the `body[data-ds-dark-theme]` block of the same file. That selector has to be repeated because the official dark tokens are more specific than `:root`; a `:root` override would lose.

After editing, rebuild — otherwise the page still loads the old CSS:

```bash
cd /root/workspace/plugins/dsh-skin
npm run build     # writes client.js
npm run check     # client.js matches the source + token names exist
npm test          # deterministic gate (node --test)
```

`npm run tokens` prints which official tokens the skin covers and whether any names have drifted.

## Usage

The skin loads with the client bundle and applies immediately. From the browser console:

```js
__dshSkin.status()   // {present, lastInHead, scope, cssBytes}
__dshSkin.remount()  // re-mount manually after the host reloads its theme
```

`__dshSkin.status()` is the quickest way to tell whether the stylesheet is present and whether it is the last `<style>` in `<head>`.

## Verification

```bash
# 1) Grab this launch's one-time token (it changes on every restart)
URL=$(journalctl -u deepseek-harness.service --since today | grep -o 'http://127.0.0.1:3080/?token=[A-Za-z0-9]*' | tail -1)

# 2) Real-browser run: 13 assertions plus before/after screenshots
cd /root/workspace/plugins/dsh-skin
PLAYWRIGHT_PATH=/root/workspace/hermes-site/tools/node_modules/playwright \
  node scripts/verify-ui.mjs --url "$URL" --out /root/workspace/dsh-ext/docs/verification/skin
```

The assertions cover: `__dshSkin` is mounted; the stylesheet is last in `<head>`; `html[data-dsh-skin]` is the scope; light radii go `8px→10px` and `16px→18px`; the light accent is `#3b6fe0`; `business-primary` and the focus ring follow the accent; **removing the skin returns every value to the official default** (an A/B proof that the change comes from this plugin); the dark accent is `#7aa2ff`; the dark overrides survive the official `body[data-ds-dark-theme]` rules; and the page raises no JS errors. Reports and screenshots land in `docs/verification/skin/` (`verify-ui.json`, `before-*.png`, `after-*.png`).

One known limitation of the harness: headless Chromium here has no Chinese fonts, so Chinese text shows as boxes in the screenshots. That is a font problem on the verification machine, not a page problem; token and layout assertions are unaffected.

## Repository layout

```
index.js              host half: /skin/status (read-only self-check route)
client.js             generated client bundle (CSS inlined, scope attribute set)
client-src/client.js  client source: injects the <style> and exposes __dshSkin
styles/skin.css       the only file to edit for visual changes
scripts/build.mjs     build + token-name validation + `--check` mode
scripts/tokens.mjs    alias for `build.mjs --tokens`
scripts/verify-ui.mjs headless-Chromium verification
test/skin.test.mjs    deterministic gates (node --test)
cordis.patch.yml      bundle patch: insert id=dsh-skin
```

## Scope boundaries

- This package owns **appearance only**. Layout and the mobile skeleton stay with `dsh-mobile-ux`; the skin contains no layout properties, and token overrides apply at narrow widths too.
- It does not take over the user's theme / font / text-size preferences in Settings. That is `dsh-client-ui-theme`'s job, and overriding it would invalidate personal choices.
- The brand color is a single base palette, not two mutually exclusive light/dark skins. Multiple registered themes are a `ctx.theme` plugin concern and can be added separately if ever needed.

## Uninstall

```bash
dsh plugin --profile web remove dsh-skin
systemctl restart deepseek-harness.service
```

After removal there is no `style[data-dsh-skin]` in the page and the `data-dsh-skin` attribute is gone from `html`, so nothing is left behind.

## Commit convention

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <summary in Chinese>`.

- `type`: `feat` / `fix` / `docs` / `test` / `build` / `chore` / `refactor`
- `scope`: the affected part, e.g. `host`, `client`, `panel`, `ai`, `layout`, `verify`
- Summary in the imperative, no trailing period, under 50 characters; the body explains the why and the blast radius
- One commit does one thing; run `npm run check` (or the equivalent) and the matching verification script before committing
