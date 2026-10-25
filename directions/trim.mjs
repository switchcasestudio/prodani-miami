/* Trim transparent margins off cutout PNGs (and optionally split one into
   vertical bands first). Uses headless Chrome's canvas — no image libs here.
   Usage: node directions/trim.mjs assets/cut/cherry-white.png [...]
          node directions/trim.mjs --split 0.53 assets/cut/banana.png   (→ banana-a.png / banana-b.png) */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve, dirname, basename, join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9600 + (process.pid % 200)
const args = process.argv.slice(2)
let split = null
if (args[0] === '--split') { split = Number(args[1]); args.splice(0, 2) }
const files = args.map(f => resolve(f))
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const profile = `/tmp/trim-profile-${process.pid}`
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--allow-file-access-from-files',
  '--no-first-run', '--no-default-browser-check', '--disable-features=Translate,MediaRouter', 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 120; i++) { try { version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(r => r.json()); break } catch { await sleep(250) } }
if (!version) { chrome.kill(); throw new Error('chrome never came up on port ' + PORT) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let seq = 0; const waiting = new Map()
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && waiting.has(msg.id)) { const { res, rej } = waiting.get(msg.id); waiting.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result) } }
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })) })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
/* about:blank is a null origin, which taints a canvas drawn from a file:// image.
   Loading a file:// document first makes the image same-origin (with --allow-file-access-from-files). */
await send('Page.navigate', { url: `file://${dirname(files[0])}/` }, sessionId)
await sleep(800)

const JS = (src, y0, y1) => `(async () => {
  const img = new Image(); img.src = ${JSON.stringify(src)}; await img.decode();
  const sy = Math.floor(img.height * ${y0}), sh = Math.ceil(img.height * ${y1}) - sy;
  const c = document.createElement('canvas'); c.width = img.width; c.height = sh;
  const x = c.getContext('2d'); x.drawImage(img, 0, sy, img.width, sh, 0, 0, img.width, sh);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
  for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
    if (d[(y * c.width + xx) * 4 + 3] > 8) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y } }
  const pad = 2; minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(c.width - 1, maxX + pad); maxY = Math.min(c.height - 1, maxY + pad);
  const o = document.createElement('canvas'); o.width = maxX - minX + 1; o.height = maxY - minY + 1;
  o.getContext('2d').drawImage(c, minX, minY, o.width, o.height, 0, 0, o.width, o.height);
  return [o.width, o.height, o.toDataURL('image/png')];
})()`

for (const f of files) {
  const bands = split ? [[0, split, '-a'], [split, 1, '-b']] : [[0, 1, '']]
  for (const [y0, y1, suffix] of bands) {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression: JS(`file://${f}`, y0, y1), awaitPromise: true, returnByValue: true }, sessionId)
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text)
    const [w, h, url] = result.value
    const out = join(dirname(f), basename(f, '.png') + suffix + '.png')
    writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'))
    console.log(`${basename(out)}  ${w}x${h}`)
  }
}
ws.close(); chrome.kill(); process.exit(0)
