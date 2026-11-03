/**
 * dsh-skin 的确定性质量门（`node --test test/`）。
 *
 * 这里只测能离线判定的东西：
 *   1. client.js 与 styles/skin.css 一致（防止改了样式忘构建）；
 *   2. token 名全部真实存在（DSH 改 token 名 → 这里先红，而不是线上静默失效）；
 *   3. 生成的 client.js 是合法 JS 且带上了样式表内容。
 * 浏览器里的实际观感不在这里断言——那属于部署后的验收（见 README）。
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BUILD = join(ROOT, 'scripts/build.mjs')

const run = (args) => spawnSync(process.execPath, [BUILD, ...args], { cwd: ROOT, encoding: 'utf8' })

test('client.js 与 styles/skin.css 同步（未忘跑构建）', () => {
  const result = run(['--check'])
  assert.equal(result.status, 0, `build --check 失败：\n${result.stdout}${result.stderr}`)
})

test('token 名在官方样式表里都存在', () => {
  const result = run([])
  assert.equal(result.status, 0, `token 校验失败：\n${result.stdout}${result.stderr}`)
})

test('client.js 是合法 JS，并内联了样式表', () => {
  const client = readFileSync(join(ROOT, 'client.js'), 'utf8')
  const css = readFileSync(join(ROOT, 'styles/skin.css'), 'utf8')
  assert.match(client, /data-dsh-skin/, 'client.js 必须带作用域属性名')
  assert.ok(client.includes(JSON.stringify(css).slice(1, 80)), 'client.js 必须内联 styles/skin.css')
  const syntax = spawnSync(process.execPath, ['--check', join(ROOT, 'client.js')], { encoding: 'utf8' })
  assert.equal(syntax.status, 0, `client.js 语法错误：${syntax.stderr}`)
})

test('样式表只改 token，不按 class 抓别人的 DOM', () => {
  const css = readFileSync(join(ROOT, 'styles/skin.css'), 'utf8')
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors = withoutComments.match(/^[^{}@/]+(?=\{)/gm) ?? []
  for (const selector of selectors) {
    const trimmed = selector.trim()
    if (trimmed === '' || trimmed.startsWith('@media')) continue
    assert.doesNotMatch(
      trimmed,
      /class\*?=/,
      `选择器不得依赖第三方 class（DSH 升级后会静默失效）：${trimmed}`,
    )
  }
})
