import express from 'express'
import cors from 'cors'
import Parser from 'rss-parser'
import dns from 'node:dns/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 8787
const isProduction = process.env.NODE_ENV === 'production'
const app = express()
const parser = new Parser({ timeout: 25000 })

app.use(cors())

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`[req] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`)
  })
  next()
})

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    )
  }
  if (net.isIPv6(ip)) {
    return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')
  }
  return false
}

async function assertSafeUrl(rawUrl) {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('不正なURLです')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('httpまたはhttpsのURLを指定してください')
  }
  const hostname = parsed.hostname
  if (hostname === 'localhost') {
    throw new Error('このホストへのアクセスは許可されていません')
  }
  let addresses
  try {
    addresses = await dns.lookup(hostname, { all: true })
  } catch {
    throw new Error('ホスト名を解決できませんでした')
  }
  if (addresses.some((a) => isPrivateIp(a.address))) {
    throw new Error('このホストへのアクセスは許可されていません')
  }
  return parsed
}

app.get('/api/feed', async (req, res) => {
  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url クエリパラメータが必要です' })
  }

  try {
    const safeUrl = await assertSafeUrl(url)
    const feed = await parser.parseURL(safeUrl.toString())
    res.json({
      feedTitle: feed.title || safeUrl.hostname,
      items: (feed.items || []).slice(0, 30).map((item) => ({
        title: item.title || '(無題)',
        link: item.link,
        guid: item.guid,
        pubDate: item.pubDate || item.isoDate,
        contentSnippet: (item.contentSnippet || '').slice(0, 200)
      }))
    })
  } catch (err) {
    console.error(`[/api/feed] url=${url} error=`, err)
    res.status(502).json({ error: err.message || 'フィードの取得に失敗しました' })
  }
})

app.get('/api/discover-feed', async (req, res) => {
  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url クエリパラメータが必要です' })
  }

  let safeUrl
  try {
    safeUrl = await assertSafeUrl(url)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  try {
    const feed = await parser.parseURL(safeUrl.toString())
    if (!feed.items) throw new Error()
    res.json({ candidates: [{ url: safeUrl.toString(), title: feed.title || safeUrl.hostname }] })
  } catch {
    res.status(404).json({ error: 'RSS/Atomフィードとして読み込めませんでした。フィードのURLを直接指定してください' })
  }
})

app.get('/api/health', (req, res) => res.json({ ok: true }))

if (isProduction) {
  const distDir = path.join(__dirname, 'dist')
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`RSS-X server listening on http://localhost:${PORT}`)
})
