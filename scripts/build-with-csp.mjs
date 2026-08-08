/**
 * Production build that keeps the CSP script hashes in sync with the
 * prerendered HTML — without paying for two `next build` runs every time.
 *
 * Inline-script bodies are byte-deterministic across builds of unchanged
 * source, so the hashes only change when the page source does. Most builds
 * therefore ship after a single `next build`; the rare build that changes the
 * hashes rebuilds once so the proxy bundle (which statically imports
 * `csp-hashes.generated.ts`) ships the new values, then verifies.
 *
 *   "build": "node scripts/build-with-csp.mjs"
 */
import { spawnSync } from 'node:child_process'
import { generateHashes, verifyHashes } from './generate-csp-hashes.mjs'

function runNextBuild() {
  const result = spawnSync(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'build'],
    { stdio: 'inherit', cwd: process.cwd() }
  )
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

runNextBuild()
const changed = generateHashes()
if (changed) {
  console.log('[build-with-csp] inline-script hashes changed — rebuilding so the proxy ships them')
  runNextBuild()
}
verifyHashes()
