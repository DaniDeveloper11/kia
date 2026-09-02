import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, 'dist')
const PORT = Number(process.env.PORT) || 8080

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

// Hashed filenames from the Vite build (index-CKA81mDZ.css) can be cached
// forever; everything else must be revalidated so deploys take effect.
const HASHED = /-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/

function resolveFile(urlPath) {
  // normalize() collapses "..", so a decoded path can't escape ROOT.
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '')
  const candidate = join(ROOT, clean)
  if (!candidate.startsWith(ROOT)) return null

  for (const path of [candidate, join(candidate, 'index.html')]) {
    try {
      if (statSync(path).isFile()) return path
    } catch {}
  }
  return null
}

createServer((req, res) => {
  const match = resolveFile(req.url || '/')
  // Unknown paths still return index.html so the landing renders instead of
  // a bare error page, but with a 404 so crawlers don't index them.
  const file = match ?? join(ROOT, 'index.html')

  res.writeHead(match ? 200 : 404, {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': HASHED.test(file)
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  })

  if (req.method === 'HEAD') return res.end()
  createReadStream(file).pipe(res)
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Serving ${ROOT} on http://0.0.0.0:${PORT}`)
})
