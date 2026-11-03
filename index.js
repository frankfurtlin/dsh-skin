/**
 * dsh-skin — Host half.
 *
 * 本插件是纯浏览器侧的「视觉基座」：host 半负责让 DSH 把本包挂进 profile
 * （package.json 的 `dsh.bundle.patch`）并暴露客户端 bundle
 * （`dsh.client.platform: "web"` + exports `./client`）。
 *
 * 样式逻辑全部在 `client.js`（由 `scripts/build.mjs` 从 `styles/skin.css` 生成）。
 * host 半只额外提供一个只读自检路由 `/skin/status`：`curl` 一下就知道插件到底
 * 挂上没有、client bundle 有多大，不必开浏览器抓页面。它不写任何文件、不申请
 * 其它 host 服务，所以对 DSH 版本的耦合仍然只有 `ctx.webServer` 这一个稳定 API。
 */

import { readFileSync } from 'node:fs'

/** Cordis 插件名；必须与 package.json `name` / cordis.patch.yml `id` 一致。 */
export const name = 'dsh-skin'

/** `/skin/status` 自检路由的路径。 */
export const STATUS_PATH = '/skin/status'

/**
 * 只依赖 webServer 服务（官方 dsh-host-webserver 提供）。
 * 声明在 inject 里，cordis 才会等它就绪后再调用 apply，路由才注册得上。
 */
export const inject = ['webServer']

/** client.js 的体积（读不到就返回 null，面板照常可用）。 */
function clientBytes() {
  try {
    return readFileSync(new URL('./client.js', import.meta.url)).byteLength
  } catch {
    return null
  }
}

/** 本包覆盖了多少个官方 --dsw-* token（直接从样式源数，避免手写数字漂移）。 */
function tokenCount() {
  try {
    const css = readFileSync(new URL('./styles/skin.css', import.meta.url), 'utf8')
    return new Set(css.match(/--dsw-[a-z0-9-]+\s*:/g) ?? []).size
  } catch {
    return null
  }
}

/** 本包版本号，用于确认页面加载的是哪一版皮肤。 */
function packageVersion() {
  try {
    return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version ?? null
  } catch {
    return null
  }
}

/**
 * 注册 `/skin/status`。
 *
 * 注意 DSH 会在插件重载时重新执行 apply，所以路由注册必须包在 `ctx.effect`
 * 里，dispose 时才能干净摘掉（见 dsh-mobile-ux/lib/pairing.js:202 同款写法）。
 */
function registerStatus(ctx, ws) {
  if (ws === undefined || typeof ws.register !== 'function') return
  const payload = () =>
    JSON.stringify({
      plugin: name,
      version: packageVersion(),
      clientBytes: clientBytes(),
      styleId: 'dsh-skin',
      scopeAttribute: 'data-dsh-skin',
      tokens: tokenCount(),
      note: '浏览器侧状态请读 window.__dshSkin.status()',
    })
  ctx.effect(() => {
    ws.register({
      kind: 'exact',
      path: STATUS_PATH,
      handler: (req, res) => {
        const body = payload()
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        })
        res.end(body)
      },
    })
  })
}

/**
 * 挂载：host 侧只做自检路由，视觉层交给 client.js。
 */
export function apply(ctx) {
  registerStatus(ctx, ctx?.webServer)
}
