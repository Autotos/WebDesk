import { Router, type Request, type Response } from 'express'
import { Readable } from 'node:stream'
import { rewriteHtml } from '../utils/htmlRewriter.js'

/**
 * Enhanced browser proxy router.
 *
 * GET /api/browser/proxy?url=https://example.com
 *
 * For **HTML** responses the body is buffered, parsed with cheerio,
 * and rewritten so that:
 *   - A `<base>` tag is injected for correct relative-URL resolution.
 *   - Resource URLs (img, script, link …) are converted to absolute.
 *   - A small script is injected to intercept navigation events and
 *     forward them to the parent WebDesk frame via `postMessage`.
 *
 * For **non-HTML** responses (images, CSS, JS, fonts …) the body is
 * streamed through untouched.
 *
 * In both cases, `X-Frame-Options` and `Content-Security-Policy`
 * headers are stripped so the content can be rendered inside an
 * `<iframe>`.
 */

// ── Constants ───────────────────────────────────────────────────────

const MAX_HTML_BYTES = 10 * 1024 * 1024  // 10 MB – HTML buffering limit
const MAX_STREAM_BYTES = 50 * 1024 * 1024 // 50 MB – streaming limit
const TIMEOUT_MS = 30_000

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/** Response headers that are safe to forward to the client. */
const PASSTHROUGH_HEADERS = [
  'content-type',
  'content-language',
  'cache-control',
  'last-modified',
  'etag',
]

// ── Router ──────────────────────────────────────────────────────────

export function createBrowserProxyRouter(): Router {
  const router = Router()

  router.get('/', async (req: Request, res: Response) => {
    /* ---------- 1. Validate query parameter ---------------------- */
    const { url } = req.query

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Missing "url" query parameter' })
      return
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(url)
      if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        res.status(400).json({ error: 'Only http/https URLs are allowed' })
        return
      }
    } catch {
      res.status(400).json({ error: 'Invalid URL' })
      return
    }

    /* ---------- 2. SSRF guard ------------------------------------ */
    if (isPrivateHost(targetUrl.hostname)) {
      res
        .status(403)
        .json({ error: 'Requests to private/internal addresses are not allowed' })
      return
    }

    /* ---------- 3. Fetch upstream -------------------------------- */
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    // Abort if the browser tab is closed / client disconnects
    req.on('close', () => controller.abort())

    try {
      const upstream = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': BROWSER_UA,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,' +
            'image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
          // Request uncompressed content so we can parse HTML directly.
          // Node fetch would auto-decompress, but some edge-cases are
          // safer this way.
          'Accept-Encoding': 'identity',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow',
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!upstream.ok) {
        res.status(upstream.status).json({
          error: `Upstream returned ${upstream.status} ${upstream.statusText}`,
        })
        return
      }

      // ── Common: strip frame-blocking headers ──────────────────
      res.removeHeader('X-Frame-Options')
      res.removeHeader('Content-Security-Policy')
      res.setHeader('X-Proxy-Source', targetUrl.origin)

      // Detect content type
      const contentType = upstream.headers.get('content-type') || ''
      const isHtml =
        contentType.includes('text/html') ||
        contentType.includes('application/xhtml+xml')

      if (isHtml && upstream.body) {
        /* ======== HTML path: buffer → rewrite → send ============ */
        const htmlBuf = await bufferBody(upstream.body, MAX_HTML_BYTES)

        // Decode
        const charset = extractCharset(contentType) || 'utf-8'
        let html: string
        try {
          html = new TextDecoder(charset, { fatal: false }).decode(htmlBuf)
        } catch {
          html = new TextDecoder('utf-8', { fatal: false }).decode(htmlBuf)
        }

        const rewritten = rewriteHtml(html, targetUrl.toString())

        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.send(rewritten)
      } else {
        /* ======== Non-HTML path: stream through ================== */
        for (const name of PASSTHROUGH_HEADERS) {
          const value = upstream.headers.get(name)
          if (value) res.setHeader(name, value)
        }

        const cl = upstream.headers.get('content-length')
        if (cl && parseInt(cl, 10) > MAX_STREAM_BYTES) {
          res.status(413).json({ error: 'Response too large' })
          return
        }

        if (!upstream.body) {
          res.end()
          return
        }

        const nodeStream = Readable.fromWeb(
          upstream.body as import('node:stream/web').ReadableStream,
        )

        let bytes = 0
        nodeStream.on('data', (chunk: Buffer) => {
          bytes += chunk.length
          if (bytes > MAX_STREAM_BYTES) {
            nodeStream.destroy(new Error('Response too large'))
          }
        })

        nodeStream.pipe(res)
        nodeStream.on('error', () => {
          if (!res.writableEnded) res.end()
        })
      }
    } catch (err) {
      clearTimeout(timeout)

      if ((err as Error).name === 'AbortError') {
        if (!res.headersSent) {
          res.status(504).json({ error: 'Request timed out' })
        }
        return
      }

      const e = err as NodeJS.ErrnoException
      if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') {
        res
          .status(502)
          .json({ error: `Cannot reach ${targetUrl.hostname}: ${e.code}` })
        return
      }

      console.error('[browser-proxy]', (err as Error).message)
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy error' })
      }
    }
  })

  return router
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Consume a web ReadableStream into a single Buffer, respecting a
 *  size limit. */
async function bufferBody(
  body: ReadableStream<Uint8Array>,
  limit: number,
): Promise<Buffer> {
  const reader = body.getReader()
  const chunks: Buffer[] = []
  let total = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const buf = Buffer.from(value)
    total += buf.length
    if (total > limit) throw new Error('HTML response too large')
    chunks.push(buf)
  }

  return Buffer.concat(chunks)
}

/** Pull charset from a Content-Type header, e.g.
 *  `text/html; charset=gb2312` → `gb2312`. */
function extractCharset(contentType: string): string | null {
  const m = contentType.match(/charset=([^\s;]+)/i)
  return m ? m[1].replace(/['"]/g, '') : null
}

/** SSRF guard – block requests to loopback / private addresses. */
function isPrivateHost(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname === '[::1]'
  ) {
    return true
  }

  // 172.16.0.0 – 172.31.255.255
  if (hostname.startsWith('172.')) {
    const second = parseInt(hostname.split('.')[1], 10)
    if (second >= 16 && second <= 31) return true
  }

  return false
}
