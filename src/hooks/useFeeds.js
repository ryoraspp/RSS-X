import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'rssx.feeds'

const DEFAULT_FEEDS = [
  { id: 'nhk-main', url: 'https://www.nhk.or.jp/rss/news/cat0.xml', title: 'NHKニュース' }
]

function loadFeeds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_FEEDS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FEEDS
  } catch {
    return DEFAULT_FEEDS
  }
}

export function useFeeds() {
  const [feeds, setFeeds] = useState(loadFeeds)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds))
  }, [feeds])

  const addFeed = useCallback((url, title) => {
    const trimmed = url.trim()
    if (!trimmed) return
    setFeeds((prev) => {
      if (prev.some((f) => f.url === trimmed)) return prev
      return [...prev, { id: crypto.randomUUID(), url: trimmed, title: (title || '').trim() }]
    })
  }, [])

  const removeFeed = useCallback((id) => {
    setFeeds((prev) => prev.filter((f) => f.id !== id))
  }, [])

  return { feeds, addFeed, removeFeed }
}
