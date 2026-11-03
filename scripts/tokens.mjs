#!/usr/bin/env node
/**
 * token 盘点：我们覆盖了哪些官方 token、官方还剩多少、是否还有名字漂移。
 * 是 `scripts/build.mjs --tokens` 的入口别名（package.json scripts.tokens）。
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const build = join(dirname(fileURLToPath(import.meta.url)), 'build.mjs')
const result = spawnSync(process.execPath, [build, '--tokens'], { stdio: 'inherit' })
process.exitCode = result.status ?? 1
