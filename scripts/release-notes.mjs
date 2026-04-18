#!/usr/bin/env node
/**
 * NutriFlow — Release notes scaffolder (minimal, reusable)
 *
 * Usage:
 *   npm run release:notes -- v0.3.0
 *
 * Behaviour:
 *   - Crea `docs/releases/<version>.md` se non esiste, precompilato con
 *     l'attuale sezione `[Unreleased]` del CHANGELOG.md.
 *   - Sposta le righe da `[Unreleased]` a una nuova sezione `[<version>] — YYYY-MM-DD`
 *     nel CHANGELOG.md.
 *
 * Non introduce dipendenze esterne.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const version = (process.argv[2] || '').trim()
if (!version || !/^v\d+\.\d+\.\d+/.test(version)) {
  console.error('Usage: npm run release:notes -- v0.3.0')
  process.exit(1)
}
const short = version.replace(/^v/, '')
const today = new Date().toISOString().slice(0, 10)

const changelogPath = join(ROOT, 'CHANGELOG.md')
if (!existsSync(changelogPath)) {
  console.error('CHANGELOG.md not found')
  process.exit(1)
}
const changelog = readFileSync(changelogPath, 'utf8')

const unreleasedRe = /## \[Unreleased\]\n([\s\S]*?)(?=\n## \[|$)/m
const match = unreleasedRe.exec(changelog)
const body = (match?.[1] ?? '').trim()

// Write release note file
const notesDir = join(ROOT, 'docs', 'releases')
mkdirSync(notesDir, { recursive: true })
const notesPath = join(notesDir, `${version}.md`)
if (!existsSync(notesPath)) {
  writeFileSync(notesPath,
    `# NutriFlow ${version}\n\n` +
    `Data rilascio: ${today}\n\n` +
    (body ? body + '\n' : '_Aggiungi qui le note di release._\n')
  )
  console.log('Creato', notesPath)
} else {
  console.log('Esiste già', notesPath)
}

// Update CHANGELOG.md: move Unreleased → new version section
const newSection = `## [Unreleased]\n\n## [${short}] — ${today}\n${body ? '\n' + body + '\n' : '\n'}`
const updated = changelog.replace(unreleasedRe, newSection)
writeFileSync(changelogPath, updated)
console.log('Aggiornato CHANGELOG.md con sezione', `[${short}]`)
