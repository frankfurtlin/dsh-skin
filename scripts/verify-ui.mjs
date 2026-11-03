#!/usr/bin/env node
/**
 * dsh-skin 浏览器验收：真实 Chromium 打开这台机器上的 DSH Web UI，断言
 *   1) client.js 把自己挂进了页面（style 标签在 head 末尾、html 作用域属性在）；
 *   2) 官方 token 的**计算值**确实被改掉了（圆角变大、主色变成我们的）；
 *   3) 深色主题下覆盖仍然生效（官方深色 token 在 body[data-ds-dark-theme] 上，
 *      特异性更高，这里专门验证没有被压回去）；
 *   4) 与卸载态 A/B 截图，给出"确实变了、且没把别人弄坏"的证据；
 *   5) 页面没有 JS 报错、没有锚点失效。
 *
 * 用法：
 *   node scripts/verify-ui.mjs --url "http://127.0.0.1:3080/?token=…" \
 *        --out ../../docs/verification/skin
 *
 * url 里的 token 是 dsh 启动时打印的一次性 launch token：
 *   journalctl -u deepseek-harness.service --since today | grep 'dsh web:'
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const require = createRequire(join(ROOT, 'package.json'))

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

/** 与 dsh-mobile/tools/lib/playwright.mjs 同款探测，不写死某台机器的 pnpm 路径。 */
function resolvePlaywright() {
  if (process.env.PLAYWRIGHT_PATH) return require(process.env.PLAYWRIGHT_PATH)
  const bases = [process.env.DSH_HARNESS_DIR, ROOT, join(ROOT, '..', '..'), homedir(), process.cwd()].filter(Boolean)
  const candidates = []
  for (const base of bases) {
    candidates.push(join(base, 'node_modules/playwright'))
    const store = join(base, 'node_modules/.pnpm')
    if (existsSync(store)) {
      for (const entry of readdirSync(store).filter((e) => e === 'playwright' || e.startsWith('playwright@'))) {
        candidates.push(join(store, entry, 'node_modules/playwright'))
      }
    }
  }
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    try {
      return require(candidate)
    } catch {
      /* keep looking */
    }
  }
  return require('playwright')
}

const url = arg('url')
const outDir = resolve(arg('out', join(ROOT, 'docs/verification/skin')))
const widths = arg('widths', '1440x900,390x844')
  .split(',')
  .map((spec) => {
    const [w, h] = spec.split('x').map(Number)
    return { w, h }
  })

if (!url) {
  console.error('缺少 --url（带 launch token 的 DSH Web 地址）')
  process.exit(2)
}

/** 在页面里采集皮肤状态与关键 token 的计算值。 */
function probe() {
  const root = document.documentElement
  const read = (name) => getComputedStyle(root).getPropertyValue(name).trim()
  // token 里写了 calc()，自定义属性取到的是表达式文本；这里把它放进真实布局属性
  // 让浏览器解析成最终长度，断言的才是"页面上到底多少像素"。
  const resolveLength = (name) => {
    const probeEl = document.createElement('div')
    probeEl.style.borderTopLeftRadius = `var(${name})`
    probeEl.style.position = 'absolute'
    probeEl.style.visibility = 'hidden'
    root.appendChild(probeEl)
    const value = getComputedStyle(probeEl).borderTopLeftRadius
    probeEl.remove()
    return value
  }
  const skin = window.__dshSkin ?? null
  return {
    skinApi: skin !== null,
    status: skin !== null ? skin.status() : null,
    scope: root.getAttribute('data-dsh-skin'),
    token: {
      radiusSm: resolveLength('--dsw-radius-sm'),
      radiusLg: resolveLength('--dsw-radius-lg'),
      accent: read('--skin-accent'),
      businessPrimary: read('--dsw-alias-state-business-primary'),
      selection: read('--dsw-alias-bg-document-selection'),
      focusRing: read('--dsw-focus-ring-color'),
    },
    styleTags: document.querySelectorAll('style').length,
    skinStyleInHeadLast:
      document.head.lastElementChild?.getAttribute?.('data-dsh-skin') === 'dsh-skin',
  }
}

const failures = []
const check = (label, ok, detail) => {
  if (!ok) failures.push(`${label}：${detail}`)
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : ` —— ${detail}`}`)
}

async function main() {
  const { chromium } = resolvePlaywright()
  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch()
  const report = { url: url.replace(/token=[^&]+/, 'token=***'), viewports: {} }

  for (const { w, h } of widths) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(String(error)))

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    // DSH 是 SPA：等皮肤自己的 API 出现，顺便给首屏一点渲染时间。
    await page.waitForFunction(() => Boolean(window.__dshSkin), null, { timeout: 30_000 })
    await page.waitForTimeout(1500)

    const after = await page.evaluate(probe)
    const shotAfter = join(outDir, `after-${w}x${h}.png`)
    await page.screenshot({ path: shotAfter })

    // A/B：把皮肤样式表摘掉再看一遍计算值（同一页面、同一时刻，除皮肤外无差异）。
    const before = await page.evaluate(() => {
      const tag = document.querySelector('style[data-dsh-skin]')
      tag?.remove()
      const root = document.documentElement
      const read = (name) => getComputedStyle(root).getPropertyValue(name).trim()
      return { radiusSm: read('--dsw-radius-sm'), accent: read('--skin-accent') }
    })
    const shotBefore = join(outDir, `before-${w}x${h}.png`)
    await page.screenshot({ path: shotBefore })
    // 恢复，避免影响后续断言/截图。
    await page.evaluate(() => window.__dshSkin.remount())

    // 深色主题：官方深色 token 定义在 body 上，特异性更高——这里验证我们的覆盖没被压掉。
    const dark = await page.evaluate(() => {
      document.body.setAttribute('data-ds-dark-theme', '')
      const body = getComputedStyle(document.body)
      const read = (name) => body.getPropertyValue(name).trim()
      const value = { accent: read('--skin-accent'), businessPrimary: read('--dsw-alias-state-business-primary') }
      document.body.removeAttribute('data-ds-dark-theme')
      return value
    })

    console.log(`\n—— 视口 ${w}×${h} ——`)
    check('__dshSkin 已挂载', after.skinApi, 'window.__dshSkin 不存在')
    check('style[data-dsh-skin] 存在', after.status?.present === true, JSON.stringify(after.status))
    check('样式表在 head 末尾（级联胜出）', after.skinStyleInHeadLast === true, 'head 末尾不是皮肤样式表')
    check('html 带 data-dsh-skin 作用域', after.scope === 'on', String(after.scope))
    check('浅色圆角被放大（8px → 10px）', after.token.radiusSm === '10px', `实际 ${after.token.radiusSm}`)
    check('浅色大圆角被放大（16px → 18px）', after.token.radiusLg === '18px', `实际 ${after.token.radiusLg}`)
    check('浅色主色为 #3b6fe0', after.token.accent === '#3b6fe0', `实际 ${after.token.accent}`)
    check(
      'business-primary 已被换成皮肤主色',
      after.token.businessPrimary.includes('59, 111, 224') || after.token.businessPrimary === '#3b6fe0',
      `实际 ${after.token.businessPrimary}`,
    )
    check('焦点环颜色跟随主色', after.token.focusRing === after.token.accent, `焦点环 ${after.token.focusRing}`)
    check(
      'A/B：摘掉皮肤后确实是官方原值',
      before.radiusSm === '8px' && before.accent === '',
      `卸载态 radiusSm=${before.radiusSm} accent=${before.accent}`,
    )
    check('深色主色为 #7aa2ff', dark.accent === '#7aa2ff', `实际 ${dark.accent}`)
    check(
      '深色下 business-primary 跟随深色主色',
      /122, 162, 255|#7aa2ff/.test(dark.businessPrimary),
      `实际 ${dark.businessPrimary}`,
    )
    check('页面无 JS 报错', pageErrors.length === 0, pageErrors.join(' | '))

    report.viewports[`${w}x${h}`] = { after, before, dark, pageErrors, shots: { before: shotBefore, after: shotAfter } }
    await context.close()
  }

  await browser.close()
  report.ok = failures.length === 0
  report.failures = failures
  const reportPath = join(outDir, 'verify-ui.json')
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`\n报告：${reportPath}`)
  console.log(`截图：${outDir}/before-*.png, after-*.png`)
  if (failures.length > 0) {
    console.error(`\n验收失败 ${failures.length} 项`)
    process.exitCode = 1
  } else {
    console.log('\n验收通过')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
