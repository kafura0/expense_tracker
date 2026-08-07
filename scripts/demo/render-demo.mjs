import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readdirSync, statSync, rmSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const FFMPEG_BIN =
  process.env.FFMPEG_PATH ??
  'C:\\Users\\User\\AppData\\Local\\Temp\\opencode\\ffmpeg\\x\\ffmpeg-9.0-essentials_build\\bin\\ffmpeg.exe'
const FFPROBE_BIN =
  'C:\\Users\\User\\AppData\\Local\\Temp\\opencode\\ffmpeg\\x\\ffmpeg-9.0-essentials_build\\bin\\ffprobe.exe'
const FONT_SRC = 'C:\\Windows\\Fonts\\arialbd.ttf'

const root = resolve(import.meta.dirname, '../..')
const resultsDir = join(root, 'test-results')
const outDir = join(root, 'demos')
const assetsDir = join(root, 'docs', 'template', 'demo_files')

// Workdir with no spaces/colons/backslashes beyond the drive letter.
const workDir = 'C:\\Users\\User\\AppData\\Local\\Temp\\opencode\\ffmpeg\\render'
const outWebm = join(outDir, 'ledgerly-demo.webm')
const outMp4 = join(outDir, 'ledgerly-demo.mp4')
const previewDir = join(outDir, 'preview')

const EMERALD = '0x34d399'
const MUTED = '0x94a3b8'
const LINE = '0xcbd5e1'

// Cleaned narration script — paragraph-per-line so the TTS adds a natural
// pause between sections. Target pace ~135-145 wpm (auto-tuned below).
const SCRIPT = `
Welcome to Ledgerly.

Ledgerly is a modern financial management platform designed to help individuals and organizations manage expenses securely, accurately, and efficiently.

The application is built using Next.js, TypeScript, Tailwind CSS, and Supabase, with a strong focus on security, scalability, and maintainable architecture.

In this demonstration, I'll walk through the core features of the application, including authentication, expense management, VAT calculations, live currency conversion, analytics, and the different user roles supported by the platform.

We'll begin with authentication.

Ledgerly uses Supabase Authentication with secure email and password sign-in.

Unauthenticated users cannot access protected pages, ensuring that all financial data remains secure.

Once authenticated, users are directed to their respective dashboards based on their assigned roles.

The first role is the Platform Administrator.

Platform Administrators oversee the entire platform, including organizations, users, subscriptions, and overall platform activity.

This role provides a centralized view of the system while maintaining secure separation between tenant data.

Next is the Organization Administrator.

Organization Administrators manage financial activity within their own organization.

They can monitor expenses, review analytics, and oversee users assigned to their workspace without accessing data from other organizations.

This separation is enforced through Supabase Row Level Security policies.

Finally, we have the Solo Client experience.

Individual users can securely manage their own expenses through a streamlined interface designed specifically for personal financial tracking.

Each user only has access to their own records.

Creating a new expense is straightforward.

Users provide a title, amount, currency, category, transaction date, and specify whether the expense is taxable.

The application validates all user input before saving the record to the database.

Users can also edit existing expenses or remove them when they are no longer needed.

All CRUD operations are protected by Row Level Security to ensure users can only access their own data.

Ledgerly includes configurable VAT calculations.

When an expense is marked as taxable, the application automatically calculates the VAT portion using a configurable tax rate.

This approach keeps the business logic centralized, making future tax rate updates simple while clearly separating net amounts from tax amounts.

The application also integrates with a live exchange rate API.

Expenses entered in different currencies are converted into a common reporting currency, allowing users to view accurate spending totals across multiple currencies.

Loading and error states are handled gracefully to ensure a reliable user experience.

The dashboard provides a quick overview of financial activity.

Users can view total spend, total VAT, net spend, and spending by category.

These insights update automatically as expenses are added, edited, or removed.

Ledgerly has been designed to work seamlessly across desktop, tablet, and mobile devices.

The interface adapts responsively to different screen sizes while maintaining usability and consistency.

Behind the scenes, the application emphasizes production-ready engineering practices, including secure authentication, Row Level Security, reusable components, centralized business logic, structured error handling, responsive design, and clean, maintainable code.

Thank you for taking the time to review Ledgerly.

This project demonstrates my approach to building secure, scalable, and production-ready full-stack applications with modern web technologies.

I appreciate your time and look forward to discussing the technical decisions and architecture in more detail.
`.trim()

const TARGET_DUR = 216 // narration text-only target seconds (~144 wpm)
const RATE_BAND = 6 // accept +/- 6s around target

const voice = process.env.EDGE_TTS_VOICE ?? 'en-US-JennyNeural'

function findClip(key) {
  const dir = readdirSync(resultsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .find((d) => d.includes(key))
  if (!dir) throw new Error(`No clip dir for "${key}"`)
  const video = join(resultsDir, dir, 'video.webm')
  if (!statSync(video).isFile()) throw new Error(`Missing ${video}`)
  return video
}

function run(args) {
  execFileSync(FFMPEG_BIN, args, { stdio: 'inherit', cwd: workDir })
}

function probe(path) {
  return Number(
    execFileSync(FFPROBE_BIN, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(workDir, path)], { cwd: workDir })
      .toString().trim(),
  )
}

function makeText(name, content) {
  writeFileSync(join(workDir, name), content, 'utf8')
}

// ---- prep --------------------------------------------------------------------
mkdirSync(workDir, { recursive: true })
mkdirSync(outDir, { recursive: true })
mkdirSync(previewDir, { recursive: true })
copyFileSync(FONT_SRC, join(workDir, 'arialbd.ttf'))
copyFileSync(join(assetsDir, 'Clear Ledger.mp3'), join(workDir, 'music.mp3'))

const clips = {
  landing: findClip('01---public-landing-auth-pages'),
  padmin: findClip('05---super-admin-panel'),
  orgadmin: findClip('04---org-admin'),
  orgmember: findClip('03---org-member'),
  solo: findClip('02---solo-user'),
}

const ORDER = [
  { key: 'padmin', title: 'PLATFORM ADMIN', subtitle: 'PART 1 OF 4 - USERS, PLANS, AUDIT & OVERSIGHT' },
  { key: 'orgadmin', title: 'ORG ADMIN', subtitle: 'PART 2 OF 4 - TEAM & SUBSCRIPTION MANAGEMENT' },
  { key: 'orgmember', title: 'ORG MEMBER', subtitle: 'PART 3 OF 4 - SHARED TEAM WORKSPACE' },
  { key: 'solo', title: 'SOLO USER', subtitle: 'PART 4 OF 4 - PERSONAL EXPENSE TRACKING' },
]

// ---- segments -------------------------------------------------------------------
const plan = [] // { name, file, dur, start }

// Intro card (text-only)
makeText('intro-title.txt', 'LEDGERLY')
makeText('intro-tag.txt', 'PREMIUM EXPENSE TRACKING FOR SOLOS & TEAMS')
run(['-y', '-f', 'lavfi', '-i', 'color=c=0x0a0f1e:s=800x500:d=4:r=25',
  '-vf', `drawtext=fontfile=arialbd.ttf:textfile=intro-title.txt:fontsize=64:fontcolor=${EMERALD}:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=fontfile=arialbd.ttf:textfile=intro-tag.txt:fontsize=22:fontcolor=${MUTED}:x=(w-text_w)/2:y=(h-text_h)/2+40`,
  '-c:v', 'libvpx', '-b:v', '600k', '-an', 'intro.webm'])
plan.push({ name: 'intro', file: 'intro.webm' })

// Landing clip (original)
copyFileSync(clips.landing, join(workDir, 'landing.webm'))
plan.push({ name: 'landing', file: 'landing.webm' })

// Persona segments
for (const { key, title, subtitle } of ORDER) {
  makeText('t.txt', title)
  makeText('s.txt', subtitle)
  const titleFile = `title-${key}.webm`
  run(['-y', '-f', 'lavfi', '-i', 'color=c=0x0a0f1e:s=800x500:d=2.5:r=25',
    '-vf', `drawtext=fontfile=arialbd.ttf:textfile=t.txt:fontsize=56:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-32,drawtext=fontfile=arialbd.ttf:textfile=s.txt:fontsize=26:fontcolor=${EMERALD}:x=(w-text_w)/2:y=(h-text_h)/2+34`,
    '-c:v', 'libvpx', '-b:v', '600k', '-an', titleFile])
  plan.push({ name: `title-${key}`, file: titleFile })
  copyFileSync(clips[key], join(workDir, `${key}.webm`))
  plan.push({ name: key, file: `${key}.webm` })
}

// Future plans card
makeText('future-title.txt', 'FUTURE PLANS')
makeText('future-1.txt', 'MOBILE APPS FOR IOS & ANDROID')
makeText('future-2.txt', 'API ACCESS FOR TEAMS')
makeText('future-3.txt', 'AI-POWERED SPENDING INSIGHTS')
makeText('future-4.txt', 'REAL-TIME MULTI-CURRENCY')
makeText('future-5.txt', 'COMING SOON')
run(['-y', '-f', 'lavfi', '-i', 'color=c=0x0a0f1e:s=800x500:d=6:r=25',
  '-vf', [
    `drawtext=fontfile=arialbd.ttf:textfile=future-title.txt:fontsize=44:fontcolor=${EMERALD}:x=(w-text_w)/2:y=40`,
    `drawtext=fontfile=arialbd.ttf:textfile=future-1.txt:fontsize=24:fontcolor=${LINE}:x=(w-text_w)/2:y=150`,
    `drawtext=fontfile=arialbd.ttf:textfile=future-2.txt:fontsize=24:fontcolor=${LINE}:x=(w-text_w)/2:y=222`,
    `drawtext=fontfile=arialbd.ttf:textfile=future-3.txt:fontsize=24:fontcolor=${LINE}:x=(w-text_w)/2:y=294`,
    `drawtext=fontfile=arialbd.ttf:textfile=future-4.txt:fontsize=24:fontcolor=${LINE}:x=(w-text_w)/2:y=366`,
    `drawtext=fontfile=arialbd.ttf:textfile=future-5.txt:fontsize=18:fontcolor=${MUTED}:x=(w-text_w)/2:y=436`,
  ].join(','),
  '-c:v', 'libvpx', '-b:v', '600k', '-an', 'future.webm'])
plan.push({ name: 'future', file: 'future.webm' })

// Thank-you end card
makeText('thanks-title.txt', 'THANK YOU')
makeText('thanks-tag.txt', 'LEDGERLY - SECURE, SCALABLE, PRODUCTION-READY')
run(['-y', '-f', 'lavfi', '-i', 'color=c=0x0a0f1e:s=800x500:d=6:r=25',
  '-vf', `drawtext=fontfile=arialbd.ttf:textfile=thanks-title.txt:fontsize=64:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-40,drawtext=fontfile=arialbd.ttf:textfile=thanks-tag.txt:fontsize=24:fontcolor=${EMERALD}:x=(w-text_w)/2:y=(h-text_h)/2+40`,
  '-c:v', 'libvpx', '-b:v', '600k', '-an', 'thanks.webm'])
plan.push({ name: 'thanks', file: 'thanks.webm' })

// ---- concat video ---------------------------------------------------------------
let cursor = 0
for (const p of plan) {
  p.start = cursor
  p.dur = probe(p.file)
  cursor += p.dur
}
const total = cursor

const listFile = join(workDir, 'concat.txt')
writeFileSync(listFile, plan.map((p) => `file '${p.file}'`).join('\n'), 'utf8')
console.log(`\nConcatenating ${plan.length} segments (${total.toFixed(1)}s) -> silent webm...`)
run(['-y', '-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'video-silent.webm'])

// ---- narration via edge-tts (auto-tuned to ~140 wpm) -------------------------------
makeText('script.txt', SCRIPT)

function synth(rate) {
  const args = ['--voice', voice, '--file', 'script.txt', '--write-media', 'narration.mp3']
  if (rate) args.push(`--rate=${rate}`)
  execFileSync('edge-tts', args, { cwd: workDir, stdio: 'inherit' })
}

let rate = process.env.EDGE_TTS_RATE ?? '-10%'
let dur = 0
const wordCount = SCRIPT.split(/\s+/).filter(Boolean).length
console.log(`\nSynthesizing ${wordCount} words via edge-tts (${voice})...`)
for (let i = 0; i < 6; i++) {
  synth(rate)
  dur = probe('narration.mp3')
  const wpm = (wordCount / dur) * 60
  console.log(`  pass ${i + 1}: rate=${rate} -> ${dur.toFixed(1)}s (${wpm.toFixed(0)} wpm)`)
  if (Math.abs(dur - TARGET_DUR) <= RATE_BAND) break
  const base = Number.parseFloat(rate)
  const next = Math.round((1 + base / 100) * (dur / TARGET_DUR) * 100 - 100)
  rate = `${next >= 0 ? '+' : ''}${next}%`
}
console.log(`  final narration: ${dur.toFixed(1)}s`)

// ---- mix narration + music over video -----------------------------------------------
const narrStart = 0.8
const fadeOutStart = Math.max(0, total - 2.5)
run(['-y', '-i', 'video-silent.webm', '-i', 'narration.mp3', '-i', 'music.mp3',
  '-filter_complex',
  `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${Math.round(narrStart * 1000)}:all=1,afade=t=in:d=0.8,volume=1.0[narr];` +
  `[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.12,afade=t=in:d=1.5,afade=t=out:st=${fadeOutStart}:d=2.5[music];` +
  `[narr][music]amix=inputs=2:duration=longest:normalize=0[aout]`,
  '-map', '0:v', '-map', '[aout]',
  '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '160k', '-shortest', 'final.webm'])
run(['-y', '-i', 'final.webm',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', 'final.mp4'])

copyFileSync(join(workDir, 'final.webm'), outWebm)
copyFileSync(join(workDir, 'final.mp4'), outMp4)

// ---- preview frames -------------------------------------------------------------------
const byName = Object.fromEntries(plan.map((p) => [p.name, p]))
const previews = [
  ['intro', 2],
  ['landing', byName.landing.start + 8],
  ['platform-admin', byName.padmin.start + 3],
  ['org-admin', byName.orgadmin.start + 3],
  ['org-member', byName.orgmember.start + 3],
  ['solo', byName.solo.start + 3],
  ['future', byName.future.start + 2],
  ['thanks', byName.thanks.start + 2],
]
for (const [name, ts] of previews) {
  run(['-y', '-ss', String(ts), '-i', 'final.webm', '-frames:v', '1', `preview-${name}.png`])
  copyFileSync(join(workDir, `preview-${name}.png`), join(previewDir, `${name}.png`))
}

rmSync(workDir, { recursive: true, force: true })

console.log(`\nDone: total ${total.toFixed(1)}s, narration ${dur.toFixed(1)}s at ~${((wordCount / dur) * 60).toFixed(0)} wpm`)
console.log(`  ${outWebm}`)
console.log(`  ${outMp4}`)
console.log(`  previews -> ${previewDir}`)
