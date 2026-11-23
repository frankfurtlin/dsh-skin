<div align="center">

# dsh-skin 「视觉基座」

**只改官方 theme token 的 DSH 视觉基座：品牌配色、圆角、阴影、选区与滚动条，不碰组件类名、不 fork 本体、不注入 HTML。**

A visual baseline for DSH that overrides official theme tokens only — brand colors, radii and shadows, with no CSS hacks on component classes.

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/DSH-DeepSeek%20Harness-5b5ef7)](https://github.com/frankfurtlin/dsh-pocket)

[English](README.md) · **简体中文**

</div>

## 这是什么

dsh-skin 换掉 DSH Web 的官方 `--dsw-*` theme token：品牌主色、选中底色、圆角、阴影、焦点环与滚动条，当前覆盖 17 个 token。它不改组件类名、不 fork 本体、不注入 HTML，因此 DSH 升级时几乎不会失效；即使失效，也只是颜色回到默认，不会把服务搞挂。给想统一品牌观感、又不想每次升级回来修样式的人用。

## 功能

- **一套品牌色**：浅色 `#3b6fe0` / 深色 `#7aa2ff`，链接、焦点环、选中态都跟随主色。
- **柔角**：6 个官方圆角 token 统一加厚 `2px`（`xs` 到 `panel`）。
- **轻阴影**：重定义三级阴影，滚动条带一点主色，不抢视线。
- **四个调参变量**：`--skin-accent`、`--skin-accent-soft`、`--skin-radius-step`、`--skin-shadow-slate`，都在 `styles/skin.css` 顶部。
- **构建门**：`scripts/build.mjs` 校验样式里每个 `--dsw-*` 名字真实存在于当前安装的 DSH，名字漂移直接构建失败。
- **测试门**：`test/skin.test.mjs` 断言样式表不按 `class=` 选择器抓别人的 DOM。
- **自检**：`GET /skin/status` 返回版本、client bundle 大小与覆盖 token 数；浏览器里还有 `__dshSkin.status()`。
- **真浏览器验收**：`scripts/verify-ui.mjs` 跑 13 项断言，附 before/after 截图。

## 安装

```bash
# 1) 挂进 profile（pnpm 会重装 profile 依赖，事后 dsh-post-install-repair.path 会补补丁）
dsh plugin --profile web add /root/workspace/plugins/dsh-skin
# 再把 "dsh-skin" 加进 profile package.json 的 dsh.profile.bundles

# 2) 重启服务（客户端 bundle 由 host 组织，重载后浏览器需刷新页面）
systemctl restart deepseek-harness.service

# 3) 自检：插件挂上没有
curl -s http://127.0.0.1:3080/skin/status
# {"plugin":"dsh-skin","version":"0.1.0","clientBytes":7914,...,"tokens":17}
```

## 详细文档

后面几节是完整说明：功能细节、配置项、设计取舍、验收记录。

只做一件事：在**官方扩展点**上换掉 DSH 的视觉 token（品牌色、圆角、阴影、选区、
滚动条），不改组件类名、不 fork 本体、不注入 HTML。因此 DSH 升级时它几乎不会
失效；即使失效，也只是颜色回到默认，不会像 `dsh-passwords` 那样把服务搞挂。

### 为什么是 token 而不是 CSS 覆盖

DSH 的主题系统暴露 403 个 `--dsw-*` token（浅色定义在 `:root`，深色定义在
`body[data-ds-dark-theme]`）。改 token 是官方支持的定制方式；反过来写
`[class*="xxx"]` 抓组件内部，会在每次 DSH 前端重构后静默失效——这是这类插件
最常见的腐烂方式。本仓库的两道门把这件事故变成构建失败：

- `scripts/build.mjs` 校验 CSS 里出现的每个 `--dsw-*` 名字是否真实存在于当前
  安装的 DSH `dsh-client-ui-theme/lib/client.js`；
- `test/skin.test.mjs` 断言样式表里没有 `class=` 选择器。

### 改什么（唯一入口）

`styles/skin.css` 顶部的四个变量：

```css
--skin-accent: #3b6fe0;    /* 主色：链接/焦点环/选中态 */
--skin-accent-soft: 24%;   /* 选中底色浓度 */
--skin-radius-step: 2px;   /* 全站圆角加厚量 */
--skin-shadow-slate: 15 23 42;  /* 阴影底色 rgb 分量 */
```

深色主题的对应值在同文件的 `body[data-ds-dark-theme]` 块里（官方深色 token 的
特异性高于 `:root`，所以必须用同一个选择器覆盖，否则会被压掉）。

改完必须重新构建，否则页面还是旧的：

```bash
cd /root/workspace/plugins/dsh-skin
npm run build     # 生成 client.js
npm run check     # 与源一致 + token 名校验
npm test          # 确定性门（node --test）
```

### 安装与生效

```bash
# 1) 挂进 profile（pnpm 会重装 profile 依赖，事后 dsh-post-install-repair.path 会补补丁）
dsh plugin --profile web add /root/workspace/plugins/dsh-skin

# 2) 重启服务（客户端 bundle 由 host 组织，重载后浏览器需刷新页面）
systemctl restart deepseek-harness.service

# 3) 自检：插件挂上没有
curl -s http://127.0.0.1:3080/skin/status
# {"plugin":"dsh-skin","version":"0.1.0","clientBytes":7914,...,"tokens":17}
```

浏览器侧状态（控制台）：

```js
__dshSkin.status()   // {present, lastInHead, scope, cssBytes}
__dshSkin.remount()  // 主题重载后手动重挂
```

### 浏览器验收（真的在 Chromium 里断言，不是"看着像对"）

```bash
# 1) 取本次启动的一次性 launch token（每次重启都变）
URL=$(journalctl -u deepseek-harness.service --since today | grep -o 'http://127.0.0.1:3080/?token=[A-Za-z0-9]*' | tail -1)

# 2) 真浏览器验收：连续 13 项断言 + before/after 截图
cd /root/workspace/plugins/dsh-skin
PLAYWRIGHT_PATH=/root/workspace/hermes-site/tools/node_modules/playwright \
  node scripts/verify-ui.mjs --url "$URL" --out /root/workspace/dsh-ext/docs/verification/skin
```

断言内容：`__dshSkin` 已挂载、样式表在 `head` 末尾、`html[data-dsh-skin]` 作用域、
浅色圆角 8px→10px / 16px→18px、浅色主色 `#3b6fe0`、`business-primary` 跟随主色、
焦点环跟随主色、**摘掉皮肤后回到官方原值**（A/B 证明改动确实来自本插件）、
深色主色 `#7aa2ff`、深色覆盖没被官方 `body[data-ds-dark-theme]` 压回、页面无 JS 报错。
报告与截图落在 `docs/verification/skin/`（`verify-ui.json`、`before-*.png`、`after-*.png`）。

已知限制：无头 Chromium 没装中文字体，截图里中文显示为方框；这是取证机器的字体
问题，不是页面问题（token/布局断言不受影响）。

### 交付边界

- 本包只负责**观感**；布局/移动端骨架归 `dsh-mobile-ux`，两者互不覆盖
  （本包不含任何布局属性，窄屏下 token 覆盖同样生效）。
- 不接管设置页的「主题/字号/字体」用户偏好：那是官方 `dsh-client-ui-theme` 的
  职责，覆盖它会让用户的个人选择失效。
- 品牌色是"基础色"，不做浅/深两套主题互斥的皮肤——那是 `ctx.theme` 插件注册
  多套配色的场景，需要时再单独加。

### 卸载

```bash
dsh plugin --profile web remove dsh-skin
systemctl restart deepseek-harness.service
```

卸载后页面里不再有 `style[data-dsh-skin]`，`html` 上的 `data-dsh-skin`
属性也随之消失，不留残余影响。

### 提交约定

沿用 [Conventional Commits](https://www.conventionalcommits.org/)：`<type>(<scope>): <中文摘要>`。

- `type`：`feat`（新功能）/ `fix`（修 bug）/ `docs` / `test` / `build` / `chore` / `refactor`
- `scope`：受影响的部分，如 `host`、`client`、`panel`、`ai`、`layout`、`verify`
- 摘要用祈使句、不加句号，控制在 50 字内；正文说明「为什么」和影响面
- 一次提交只做一件事；改完必须跑过 `npm run check`（或等价）与对应的验收脚本
