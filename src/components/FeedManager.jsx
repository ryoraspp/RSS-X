import { useState } from 'react'

async function discoverFeed(url) {
  const res = await fetch(`/api/discover-feed?url=${encodeURIComponent(url)}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || 'フィードの検出に失敗しました')
  }
  return body.candidates?.[0] || null
}

export default function FeedManager({ feeds, addFeed, removeFeed, feedErrors }) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setStatus('loading')
    setError('')

    try {
      const found = await discoverFeed(trimmed)
      if (!found) throw new Error('RSSフィードが見つかりませんでした')
      addFeed(found.url, found.title)
      setUrl('')
      setStatus('idle')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="feed-manager">
      <form onSubmit={handleSubmit} className="feed-form">
        <input
          type="url"
          required
          placeholder="RSSフィードのURLを入力"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '確認中…' : '追加'}
        </button>
      </form>

      {status === 'error' && <p className="feed-discover-error">⚠ {error}</p>}

      <ul className="feed-list">
        {feeds.map((feed) => (
          <li key={feed.id} className="feed-item">
            <span className="feed-info">
              <span className="feed-title">{feed.title || feed.url}</span>
              <span className="feed-url" title={feed.url}>
                {feed.url}
              </span>
            </span>
            {feedErrors[feed.id] && (
              <span className="feed-error" title={feedErrors[feed.id]}>
                ⚠ 取得エラー
              </span>
            )}
            <button
              type="button"
              className="feed-remove"
              onClick={() => removeFeed(feed.id)}
              aria-label="フィードを削除"
            >
              ×
            </button>
          </li>
        ))}
        {feeds.length === 0 && <li className="feed-empty">フィードが登録されていません</li>}
      </ul>
    </div>
  )
}
