#!/usr/bin/env bun

import { cp, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

const root = import.meta.dir
const outRoot = join(root, 'dist')

const SKIP_DIRS = new Set(['dist', 'node_modules'])

async function isWidgetDir(name: string): Promise<boolean> {
  if (name.startsWith('.') || SKIP_DIRS.has(name)) return false

  const dir = join(root, name)
  const pkgPath = join(dir, 'package.json')

  try {
    const pkgStat = await stat(pkgPath)
    if (!pkgStat.isFile()) return false

    const pkg = (await Bun.file(pkgPath).json()) as { scripts?: { build?: string } }
    return typeof pkg.scripts?.build === 'string'
  } catch {
    return false
  }
}

async function runNpm(cwd: string, args: string[], label: string): Promise<void> {
  const proc = Bun.spawn(['npm', ...args], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  })

  const code = await proc.exited
  if (code !== 0) {
    throw new Error(`${label} failed (exit ${code})`)
  }
}

async function buildWidget(name: string): Promise<void> {
  const dir = join(root, name)

  console.log(`Installing ${name}...`)
  await runNpm(dir, ['install'], `${name}: npm install`)

  console.log(`Building ${name}...`)
  await runNpm(dir, ['run', 'build'], `${name}: build`)

  const srcDist = join(dir, 'dist')
  try {
    await stat(srcDist)
  } catch {
    throw new Error(`${name}: expected dist/ after build`)
  }

  const destDist = join(outRoot, name)
  await rm(destDist, { recursive: true, force: true })
  await cp(srcDist, destDist, { recursive: true })
  console.log(`  → dist/${name}/`)
}

async function main(): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true })
  const widgets: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (await isWidgetDir(entry.name)) {
      widgets.push(entry.name)
    }
  }

  if (widgets.length === 0) {
    throw new Error('No widget folders found (expected package.json with a build script)')
  }

  widgets.sort()
  await rm(outRoot, { recursive: true, force: true })

  for (const name of widgets) {
    await buildWidget(name)
  }

  console.log(`\nBuilt ${widgets.length} widget(s) to dist/`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
