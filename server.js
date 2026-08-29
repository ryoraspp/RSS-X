import express from 'express'
import cors from 'cors'
import Parser from 'rss-parser'
import * as cheerio from 'cheerio'
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
    res.status(502).json({ error: err.message || 'フィードの取得に失敗しました' })
  }
})

const COMMON_FEED_PATHS = [
  '/feed',
  '/feed/',
  '/rss',
  '/rss/',
  '/rss.xml',
  '/atom.xml',
  '/index.xml',
  '/feed.xml',
  '/feeds/posts/default'
]

async function tryParseFeed(candidateUrl) {
  try {
    const safe = await assertSafeUrl(candidateUrl)
    const feed = await parser.parseURL(safe.toString())
    if (!feed.items) return null
    return { url: safe.toString(), title: feed.title || safe.hostname }
  } catch {
    return null
  }
}

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

  // 入力自体が既にフィードURLの場合はそのまま採用
  const direct = await tryParseFeed(safeUrl.toString())
  if (direct) {
    return res.json({ candidates: [direct] })
  }

  let html
  try {
    const response = await fetch(safeUrl.toString(), {
      headers: { 'User-Agent': 'RSS-X-FeedDiscovery/1.0' },
      signal: AbortSignal.timeout(10000)
    })
    if (!response.ok) {
      throw new Error(`ページの取得に失敗しました (${response.status})`)
    }
    html = await response.text()
  } catch (err) {
    return res.status(502).json({ error: err.message || 'ページの取得に失敗しました' })
  }

  const $ = cheerio.load(html)
  const linkCandidates = new Set()
  $('link[rel="alternate"]').each((_, el) => {
    const type = $(el).attr('type') || ''
    const href = $(el).attr('href')
    if (href && /rss|atom|xml/i.test(type)) {
      try {
        linkCandidates.add(new URL(href, safeUrl).toString())
      } catch {
        // 不正なhrefは無視
      }
    }
  })

  const pathCandidates = COMMON_FEED_PATHS.map((p) => new URL(p, safeUrl).toString())
  const toCheck = linkCandidates.size > 0 ? [...linkCandidates] : pathCandidates

  const results = await Promise.all(toCheck.slice(0, 8).map((candidate) => tryParseFeed(candidate)))
  const seen = new Set()
  const found = []
  for (const result of results) {
    if (result && !seen.has(result.url)) {
      seen.add(result.url)
      found.push(result)
    }
  }

  if (found.length === 0) {
    return res.status(404).json({ error: 'RSS/Atomフィードが見つかりませんでした' })
  }

  res.json({ candidates: found })
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
