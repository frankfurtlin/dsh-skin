#!/usr/bin/env node
/**
 * dsh-skin 构建脚本：styles/skin.css + client-src/client.js → client.js
 *
 *   node scripts/build.mjs          生成 client.js
 *   node scripts/build.mjs --check  只校验 client.js 是否与源一致（CI/提交前用）
 *   node scripts/build.mjs --tokens 打印 token 清单（我们定义了什么、官方有没有）
 *
 * 除了拼接，构建还做一件对"升级安全"很关键的事：**token 名字校验**。
 * 皮肤只覆盖官方 `--dsw-*` token，一旦 DSH 改写了 token 名，样式会静默失效——
 * 那是这种插件最典型的腐烂方式。所以这里把 CSS 里出现的每个 token 名拿去和
 * 当前安装的 DSH ui-theme 样式表比对，名字不存在就构建失败，而不是等你哪天
 * 发现按钮颜色不对再来查。
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const CSS_PATH = join(ROOT, 'styles/skin.css')
const SRC_PATH = join(ROOT, 'client-src/client.js')
const OUT_PATH = join(ROOT, 'client.js')
const PKG_PATH = join(ROOT, 'package.json')

const CSS_PLACEHOLDER = "'__DSH_SKIN_CSS__'"

const readPkg = () => JSON.parse(readFileSync(PKG_PATH, 'utf8'))

/**
 * 从 ui-theme 的客户端 bundle 里取官方 token 名。
 *
 * 返回 null 表示"这台机器上没找到官方样式表"（例如在别的机器上构建），
 * 此时跳过校验并明确告警，而不是假装通过。
 *
 * @returns {Set<string> | null}
 */
function officialTokens() {
  const candidates = []
  if (process.env.DSH_UI_THEME_BUNDLE) candidates.push(process.env.DSH_UI_THEME_BUNDLE)

  // 常见全局安装布局：<prefix>/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js
  for (const prefix of [
    '/root/.nvm/versions/node',
    '/usr/local/lib',
    '/usr/lib',
    join(process.env.HOME ?? '/root', '.nvm/versions/node'),
  ]) {
    if (!existsSync(prefix)) continue
    let versions = []
    try {
      versions = readdirSync(prefix)
    } catch {
      continue
    }
    for (const version of versions) {
      candidates.push(
        join(prefix, version, 'lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js'),
      )
    }
    candidates.push(join(prefix, 'node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js'))
  }

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    const text = readFileSync(candidate, 'utf8')
    const tokens = new Set(text.match(/--dsw-[a-z0-9-]+/g) ?? [])
    if (tokens.size === 0) continue
    return tokens
  }
  return null
}

/** CSS 里定义的变量（`:` 左边那一侧；含官方 --dsw-* 与本插件 --skin-*）。 */
export function definedTokens(css) {
  const defined = new Set()
  const re = /(--(?:dsw|skin)-[a-z0-9-]+)\s*:/g
  let match
  while ((match = re.exec(css)) !== null) defined.add(match[1])
  return defined
}

/** CSS 里引用的 token（出现在 var(...) 里的）。 */
export function usedTokens(css) {
  const used = new Set()
  const re = /var\(\s*(--[a-z0-9-]+)/g
  let match
  while ((match = re.exec(css)) !== null) used.add(match[1])
  return used
}

/**
 * 校验 token 名是否都真实存在。
 * @returns {{ok: boolean, problems: string[], warnings: string[]}}
 */
export function checkTokens(css, official) {
  const problems = []
  const warnings = []
  if (official === null) {
    warnings.push('未找到 DSH ui-theme 样式表，跳过 token 校验（可用 DSH_UI_THEME_BUNDLE 指定路径）')
    return { ok: true, problems, warnings }
  }

  // 1) 我们定义的 --dsw-* 必须是官方 token。打错一个字母 = 覆盖静默无效。
  //    --skin-* 是本插件自有变量，不要求官方存在。
  for (const token of definedTokens(css)) {
    if (token.startsWith('--dsw-') && !official.has(token)) problems.push(`定义了官方不存在的 token：${token}`)
  }

  // 2) 我们 var() 引用的 token 必须官方有，或由本文件自己定义。
  const local = definedTokens(css)
  for (const token of usedTokens(css)) {
    if (token.startsWith('--dsw-')) {
      if (!official.has(token) && !local.has(token)) problems.push(`引用了不存在的官方 token：${token}`)
    } else if (token.startsWith('--skin-') && !local.has(token)) {
      problems.push(`引用了本文件未定义的皮肤变量：${token}`)
    }
  }

  return { ok: problems.length === 0, problems, warnings }
}

function render() {
  const css = readFileSync(CSS_PATH, 'utf8')
  const src = readFileSync(SRC_PATH, 'utf8')
  if (!src.includes(CSS_PLACEHOLDER)) {
    throw new Error(`client-src/client.js 里找不到 CSS 占位符 ${CSS_PLACEHOLDER}`)
  }
  const pkg = readPkg()
  const banner = [
    '// GENERATED for dsh-skin by scripts/build.mjs — do not edit by hand.',
    '// Sources: styles/skin.css + client-src/client.js',
    `// Version: ${pkg.version}`,
    '',
  ].join('\n')
  const body = src.replace(CSS_PLACEHOLDER, JSON.stringify(css))
  // DSH 的 client-modules 只认「执行时调用 __ModuleLoader__.load({id,factory}) 注册」
  // 的 bundle；裸 IIFE 会被判为 loaded without registering，进而 web boot 失败。
  // 这里把生成的样式注入逻辑包进官方注册外形（与 dsh-mobile-ux 等插件一致）。
  return banner + [
    'window.__ModuleLoader__.load({',
    `  id: ${JSON.stringify(pkg.name)},`,
    '  factory: (require) => {',
    '    var module = { exports: {} };',
    '    var exports = module.exports;',
    '    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
    body,
    // cordis 的 Registry.resolve 只认「函数」或「带 apply 的对象」；只注册不信
    // 会报 invalid plugin, expect function or object with an "apply" method。
    // 本插件是纯样式注入（副作用已在模块求值时完成），apply 保持空实现即可。
    `    exports.name = ${JSON.stringify(pkg.name)};`,
    '    exports.apply = function apply() {};',
    '    return module.exports;',
    '  },',
    '});',
    '',
  ].join('\n')
}

function main() {
  const args = process.argv.slice(2)
  const css = readFileSync(CSS_PATH, 'utf8')

  if (args.includes('--tokens')) {
    const official = officialTokens()
    const defined = [...definedTokens(css)].filter((t) => t.startsWith('--dsw-')).sort()
    const usedNonDsw = [...usedTokens(css)].filter((t) => !t.startsWith('--dsw-')).sort()
    console.log(`官方 --dsw-* token：${official === null ? '未找到样式表' : official.size + ' 个'}`)
    console.log(`本插件覆盖：${defined.length} 个`)
    for (const token of defined) {
      console.log(`  ${official === null || official.has(token) ? '✓' : '✗'} ${token}`)
    }
    console.log(`皮肤自有变量：${usedNonDsw.length > 0 ? usedNonDsw.join(' ') : '（无）'}`)
    return 0
  }

  const check = checkTokens(css, officialTokens())
  for (const warning of check.warnings) console.warn(`警告：${warning}`)
  if (!check.ok) {
    console.error('token 校验失败（DSH 可能改了 token 名，或本文件写错了）：')
    for (const problem of check.problems) console.error(`  - ${problem}`)
    return 1
  }

  const out = render()

  if (args.includes('--check')) {
    const current = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, 'utf8') : ''
    if (current !== out) {
      console.error('client.js 与源不一致，请运行 `node scripts/build.mjs` 重新生成。')
      return 1
    }
    console.log(`✓ client.js 已是最新（${Buffer.byteLength(out, 'utf8')} 字节）`)
    return 0
  }

  writeFileSync(OUT_PATH, out)
  console.log(`✓ 生成 client.js（${Buffer.byteLength(out, 'utf8')} 字节，CSS ${Buffer.byteLength(css, 'utf8')} 字节）`)
  return 0
}

process.exitCode = main()
