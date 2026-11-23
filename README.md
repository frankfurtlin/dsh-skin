# dsh-skin

A color and geometry pass for DSH, built only on the official `--dsw-*` theme tokens.

**English** · [简体中文](README.zh-CN.md)

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## The problem

Restyling DSH by targeting component classes works until the next frontend refactor, then stops silently. This plugin changes the documented theme tokens instead: accent color, selection, focus ring, radii and shadows. If DSH renames a token, the build fails instead of the page quietly losing its style.

## Quick example

After installing and reloading the page, the plugin reports what it mounted:

```console
$ curl -s http://127.0.0.1:3080/skin/status
{"plugin":"dsh-skin","version":"0.1.0","clientBytes":9001,"styleId":"dsh-skin","scopeAttribute":"data-dsh-skin","tokens":17,"note":"浏览器侧状态请读 window.__dshSkin.status()"}
```

In the browser console, `__dshSkin.status()` shows whether the stylesheet is in `<head>` and what scope it applied.

## Install

```bash
dsh plugin --profile web add /root/workspace/plugins/dsh-skin
# add "dsh-skin" to dsh.profile.bundles in the Web profile's package.json
systemctl restart deepseek-harness.service
curl -s http://127.0.0.1:3080/skin/status
```

Client bundles are assembled by the host, so reload the browser after the restart.

## Usage

Nothing to click. The skin loads with the client bundle. If the host reloads its theme and the stylesheet drops out:

```js
__dshSkin.remount()
```

## Configuration

`styles/skin.css` is the only file to edit. Four variables at the top set the whole look:

```css
--skin-accent: #3b6fe0;          /* links, focus ring, selected state */
--skin-accent-soft: 24%;         /* strength of the selected background */
--skin-radius-step: 2px;         /* added to every radius token */
--skin-shadow-slate: 15 23 42;   /* rgb components of the shadow tint */
```

Dark values live in the `body[data-ds-dark-theme]` block of the same file. That selector has to be repeated because the official dark tokens are more specific than `:root`.

After editing, rebuild and run the gates:

```bash
npm run build     # writes client.js
npm run check     # client.js matches the source, token names exist
npm test          # stylesheet never selects on class names
```

## What it doesn't do

- Appearance only. No layout, spacing or mobile changes; `dsh-mobile-ux` owns those.
- It does not touch the user's theme, font or text-size choice in Settings. That is the official theme plugin's job.
- One accent palette, not a theme picker. Multiple registered themes would be a separate plugin.
- No runtime config: no environment variables, no settings page. Change the CSS and rebuild.
- The token gate proves names exist, not that the result looks right. Visual proof is the 13-assertion browser check in `scripts/verify-ui.mjs`.

## Docs

The design reasoning, the two gates and the full verification list are in the Chinese README: [README.zh-CN.md](README.zh-CN.md).

## Contributing

Before sending a patch: `npm run build`, `npm run check`, `npm test`. For visual changes, run `scripts/verify-ui.mjs` too. Commit messages follow Conventional Commits; the Chinese README has the scope list.

## License

MIT. See [LICENSE](LICENSE).
