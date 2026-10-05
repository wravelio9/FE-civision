// TEMPORARY. Mimics the browser's real POST /upload to the Vercel backend.
import { readFileSync } from 'node:fs'
const BASE = 'https://be-civision.vercel.app'
const buf = readFileSync('src/assets/officer-dashboard.png')
const fd = new FormData()
fd.append('files', new Blob([buf], { type: 'image/png' }), 'probe.png')
const started = Date.now()
try {
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: fd })
  const text = await res.text()
  console.log('status:', res.status, 'in', Date.now() - started, 'ms')
  console.log('content-type:', res.headers.get('content-type'))
  console.log('body:', text.slice(0, 300))
} catch (err) {
  console.log('fetch threw (this is what the FE sees as "cannot connect"):')
  console.log(' ', err.name, '-', err.message)
  if (err.cause) console.log('  cause:', err.cause.message || err.cause)
}
