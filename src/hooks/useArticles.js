import { useCallback, useEffect, useState } from 'react'

async function fetchFeed(url) {
  const res = await fetch(`/api/feed?url=${encodeURIComponent(url)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `フィード取得に失敗しました (${res.status})`)
  }
  return res.json()
}

export function useArticles(feeds) {
  const [articles, setArticles] = useState([])
  const [feedErrors, setFeedErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const refresh = useCallback(async () => {
    if (feeds.length === 0) {
      setArticles([])
      setFeedErrors({})
      return
    }
    setLoading(true)
    const errors = {}
    const results = await Promise.all(
      feeds.map(async (feed) => {
        try {
          const data = await fetchFeed(feed.url)
          return (data.items || []).map((item) => ({
            ...item,
            feedId: feed.id,
            feedTitle: data.feedTitle || feed.title || feed.url,
            key: item.guid || item.link || `${feed.id}-${item.title}`
          }))
        } catch (err) {
          errors[feed.id] = err.message
          return []
        }
      })
    )
    const merged = results.flat().sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0
      return db - da
    })
    setArticles(merged)
    setFeedErrors(errors)
    setLoading(false)
    setLastUpdated(new Date())
  }, [feeds])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { articles, feedErrors, loading, lastUpdated, refresh }
}
