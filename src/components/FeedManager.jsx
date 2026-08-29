import { useState } from 'react'

async function discoverFeed(url) {
  const res = await fetch(`/api/discover-feed?url=${encodeURIComponent(url)}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || 'フィードの検出に失敗しました')
  }
  return body.candidates || []
}

export default function FeedManager({ feeds, addFeed, removeFeed, feedErrors }) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | choosing | error
  const [candidates, setCandidates] = useState([])
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    setStatus('loading')
    setError('')
    setCandidates([])

    try {
      const found = await discoverFeed(trimmed)
      if (found.length === 1) {
        addFeed(found[0].url)
        setUrl('')
        setStatus('idle')
      } else {
        setCandidates(found)
        setStatus('choosing')
      }
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  function handleChoose(feedUrl) {
    addFeed(feedUrl)
    setUrl('')
    setCandidates([])
    setStatus('idle')
  }

  return (
    <div className="feed-manager">
      <form onSubmit={handleSubmit} className="feed-form">
        <input
          type="url"
          required
          placeholder="サイトのURLまたはRSSフィードのURLを入力"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '検出中…' : '追加'}
        </button>
      </form>

      {status === 'error' && <p className="feed-discover-error">⚠ {error}</p>}

      {status === 'choosing' && (
        <div className="feed-candidates">
          <p className="feed-candidates-title">複数のフィードが見つかりました。追加するものを選んでください:</p>
          <ul>
            {candidates.map((c) => (
              <li key={c.url}>
                <button type="button" onClick={() => handleChoose(c.url)}>
                  {c.title}
                </button>
                <span className="feed-candidate-url">{c.url}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="feed-list">
        {feeds.map((feed) => (
          <li key={feed.id} className="feed-item">
            <span className="feed-url" title={feed.url}>
              {feed.url}
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
