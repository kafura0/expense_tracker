#!/usr/bin/env node
// Applies a migration file via the Supabase Management API, one statement
// at a time so each failure is isolated. Statements are split on ';\n'
// with a naive scanner that tracks dollar-quoted bodies and string literals.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PROJECT_REF = 'weitlewvoufvgfpkryvg'
const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`
const TOKEN = process.env.SUPABASE_MGMT_TOKEN

if (!TOKEN) {
  console.error('SUPABASE_MGMT_TOKEN env var is required')
  process.exit(1)
}

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/apply-migration.mjs <path-to-sql>')
  process.exit(1)
}

const sql = readFileSync(resolve(file), 'utf8')

function splitStatements(source) {
  const statements = []
  let current = ''
  let i = 0
  let inDollarTag = null

  const isComment = (j) => source[j] === '-' && source[j + 1] === '-'
  const skipLineComment = (j) => {
    while (j < source.length && source[j] !== '\n') j++
    return j
  }

  while (i < source.length) {
    const c = source[i]

    if (inDollarTag) {
      if (source.startsWith(inDollarTag, i)) {
        current += source.slice(i, i + inDollarTag.length)
        i += inDollarTag.length
        inDollarTag = null
      } else {
        current += c
        i++
      }
      continue
    }

    if (isComment(i)) {
      const lineEnd = skipLineComment(i)
      // Leading comment lines (before any statement content) are skipped so
      // statements never begin with '--' and get dropped by the filter below.
      if (current.trim() !== '') current += source.slice(i, lineEnd)
      i = lineEnd
      continue
    }

    if (c === '$') {
      const m = /^\$[A-Za-z_0-9]*\$/.exec(source.slice(i))
      if (m) {
        inDollarTag = m[0]
        current += m[0]
        i += m[0].length
        continue
      }
    }

    if (c === "'") {
      // naive string literal: handle doubled quotes
      current += c
      i++
      while (i < source.length) {
        current += source[i]
        if (source[i] === "'") {
          if (source[i + 1] === "'") {
            current += source[i + 1]
            i += 2
            continue
          }
          i++
          break
        }
        i++
      }
      continue
    }

    if (c === ';' && (source[i + 1] === '\n' || source[i + 1] === '\r' || source[i + 1] === undefined)) {
      statements.push((current + ';').trim())
      current = ''
      i++
      continue
    }

    current += c
    i++
  }

  if (current.trim()) statements.push(current.trim())
  return statements.filter((s) => s && !s.startsWith('--'))
}

async function run() {
  const statements = splitStatements(sql)
  console.log(`Applying ${statements.length} statements from ${file}...`)

  let ok = 0
  let failed = 0

  for (let n = 0; n < statements.length; n++) {
    const stmt = statements[n]
    const label = `#${n + 1}: ${stmt.slice(0, 90).replace(/\s+/g, ' ')}...`
    try {
      const res = await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: stmt }),
      })
      if (!res.ok) {
        const body = await res.text()
        failed++
        console.error(`FAIL ${label}\n  -> ${body.slice(0, 500)}`)
      } else {
        ok++
        console.log(`ok   ${label}`)
      }
    } catch (err) {
      failed++
      console.error(`ERR  ${label}\n  -> ${err.message}`)
    }
  }

  console.log(`\nDone: ${ok} ok, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run()
