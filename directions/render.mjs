/* Direction renderer.
   Loads directions/<dir>/index.html in a headless Chrome over CDP (same rig as
   theme/scripts/casestudy.mjs) and writes:
     out/<dir>-desktop.png   full-page at 1440 wide
     out/<dir>-mobile.png    full-page at 390 wide, mobile emulation
     out/<dir>-desktop.mp4   (--video) a smooth scroll through the page
   Usage: node directions/render.mjs <dir> [--video] [--mobile-video] [--seconds 18]
   Only the mockup HTML is loaded; the storefront is never touched. */
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9400 + (process.pid % 200)
const args = process.argv.slice(2)
const dir = args.find(a => !a.startsWith('--'))
if (!dir) { console.error('usage: node render.mjs <dir> [--video] [--mobile-video] [--seconds N] [--fps N]'); process.exit(1) }
const want = (f) => args.includes(f)
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? Number(args[i + 1]) : d }
const SECONDS = opt('--seconds', 18)
const FPS = opt('--fps', 30)
const OUT = join(HERE, 'out')
mkdirSync(OUT, { recursive: true })
const PAGE = args.includes('--page') ? args[args.indexOf('--page') + 1] : 'index'
const URL = `file://${join(HERE, dir, PAGE + '.html')}`
const NAME = PAGE === 'index' ? dir : `${dir}-${PAGE}`
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const log = (...a) => process.stderr.write(new Date().toISOString().slice(11,19) + ' ' + a.join(' ') + '\n')

/* ---------- launch ---------- */
const profile = join(OUT, `.profile-${process.pid}`)
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1440,900', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--disable-features=Translate,MediaRouter', '--force-device-scale-factor=1', 'about:blank',
], { stdio: 'ignore' })
let version
for (let i = 0; i < 60; i++) {
  try { version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(r => r.json()); break }
  catch { await sleep(250) }
}
if (!version) { chrome.kill(); throw new Error('chrome never came up') }
log('chrome up', PORT)
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
log('ws open')
let seq = 0; const waiting = new Map(); const listeners = []
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && waiting.has(msg.id)) { const { res, rej } = waiting.get(msg.id); waiting.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result) }
  else if (msg.method) for (const l of [...listeners]) l(msg)
}
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++seq; waiting.set(id, { res, rej })
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
})
const once = (method, sessionId, timeout = 30000) => new Promise((res, rej) => {
  const t = setTimeout(() => { off(); rej(new Error(`timeout waiting for ${method}`)) }, timeout)
  const l = (msg) => { if (msg.method === method && msg.sessionId === sessionId) { off(); clearTimeout(t); res(msg.params) } }
  const off = () => listeners.splice(listeners.indexOf(l), 1)
  listeners.push(l)
})

async function page({ width, height, mobile }) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Page.enable', {}, sessionId)
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }, sessionId)
  if (mobile) await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, sessionId)
  const loaded = once('Page.loadEventFired', sessionId)
  log('navigate', width)
  await send('Page.navigate', { url: URL }, sessionId)
  await loaded
  log('loaded')
  await evaluate(sessionId, 'document.fonts.ready.then(() => true)', true)
  await sleep(1200)
  return { targetId, sessionId }
}
async function evaluate(sessionId, expression, awaitPromise = false) {
  const { result } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise }, sessionId)
  return result.value
}
async function fullShot(sessionId, file, width, vh) {
  /* Driven from here, not with in-page timers: headless background targets get their
     timers throttled hard, which hung this step when it ran inside the page. */
  const h0 = await evaluate(sessionId, 'document.documentElement.scrollHeight')
  for (let y = 0; y <= h0; y += 400) { await evaluate(sessionId, `window.scrollTo(0, ${y}); true`); await sleep(40) }
  /* Pin 100vh (pages use var(--vh,100vh)), put every reveal in its final state, finish the
     transitions, freeze looping animations, and flag the document so sticky/pinned parts
     lay out flat (html.capture). One tall captureScreenshot stalls Chrome, so the page is
     shot in viewport-sized tiles and stitched with ffmpeg. */
  await evaluate(sessionId, `window.scrollTo(0, 0); document.documentElement.style.setProperty('--vh', innerHeight + 'px');
    document.documentElement.classList.add('capture'); window.__revealAll && window.__revealAll(); true`)
  await sleep(1600)
  const FREEZE = `document.getAnimations().forEach(a => { try { a.effect.getTiming().iterations === Infinity ? a.pause() : a.finish() } catch {} }); true`
  await evaluate(sessionId, FREEZE)
  const height = Math.min(await evaluate(sessionId, 'document.documentElement.scrollHeight'), 24000)
  const tiles = join(OUT, `.tiles-${process.pid}`)
  mkdirSync(tiles, { recursive: true })
  const n = Math.ceil(height / vh)
  const inputs = []
  for (let i = 0; i < n; i++) {
    const last = i === n - 1
    const y = last ? Math.max(0, height - vh) : i * vh
    await evaluate(sessionId, `window.scrollTo(0, ${y}); true`)
    await sleep(120)
    await evaluate(sessionId, FREEZE)
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
    const f = join(tiles, `t${i}.png`)
    writeFileSync(f, Buffer.from(data, 'base64'))
    inputs.push(f)
  }
  log('tiles', n)
  const rest = height - (n - 1) * vh           /* rows of the last tile that are new */
  const args = ['-v', 'error', '-y']
  inputs.forEach(f => args.push('-i', f))
  const chain = inputs.map((_, i) => `[${i}:v]`).join('')
  const lastCrop = n > 1 ? `[${n - 1}:v]crop=${width}:${rest}:0:${vh - rest}[l];` : ''
  const stackIn = n > 1 ? inputs.slice(0, -1).map((_, i) => `[${i}:v]`).join('') + '[l]' : '[0:v]'
  args.push('-filter_complex', n > 1 ? `${lastCrop}${stackIn}vstack=inputs=${n}` : 'copy', '-frames:v', '1', join(OUT, file))
  execFileSync('ffmpeg', args)
  rmSync(tiles, { recursive: true, force: true })
  console.log(`wrote out/${file}  (${width}x${height})`)
}
async function video(sessionId, file, width, height) {
  const frames = join(OUT, `.frames-${process.pid}`)
  mkdirSync(frames, { recursive: true })
  const max = await evaluate(sessionId, 'document.documentElement.scrollHeight - innerHeight')
  const n = SECONDS * FPS
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  /* hold on the hero for the first second, then a long eased scroll, then hold */
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, Math.max(0, (i / n - 0.07) / 0.86))
    const y = Math.round(ease(t) * max)
    await evaluate(sessionId, `window.scrollTo(0, ${y}); true`)
    await sleep(1000 / FPS / 2)
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 }, sessionId)
    writeFileSync(join(frames, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'))
    if (i % 60 === 0) console.log(`  frame ${i}/${n}`)
  }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, 'f%05d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(OUT, file)])
  rmSync(frames, { recursive: true, force: true })
  console.log(`wrote out/${file}  (${width}x${height}, ${SECONDS}s)`)
}

try {
  { const { sessionId, targetId } = await page({ width: 1440, height: 900, mobile: false })
    await fullShot(sessionId, `${NAME}-desktop.png`, 1440, 900)
    await send('Target.closeTarget', { targetId }) }
  { const { sessionId, targetId } = await page({ width: 390, height: 844, mobile: true })
    await fullShot(sessionId, `${NAME}-mobile.png`, 390, 844)
    await send('Target.closeTarget', { targetId }) }
  if (want('--video')) {
    const { sessionId, targetId } = await page({ width: 1440, height: 900, mobile: false })
    await video(sessionId, `${NAME}-desktop.mp4`, 1440, 900)
    await send('Target.closeTarget', { targetId })
  }
  if (want('--mobile-video')) {
    const { sessionId, targetId } = await page({ width: 390, height: 844, mobile: true })
    await video(sessionId, `${NAME}-mobile.mp4`, 390, 844)
    await send('Target.closeTarget', { targetId })
  }
} finally {
  ws.close(); chrome.kill()
  await sleep(500)
  try { if (existsSync(profile)) rmSync(profile, { recursive: true, force: true }) } catch {}
}
process.exit(0)
