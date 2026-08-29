import { useState } from 'react'
import { useFeeds } from './hooks/useFeeds.js'
import { useArticles } from './hooks/useArticles.js'
import { usePosted } from './hooks/usePosted.js'
import FeedManager from './components/FeedManager.jsx'
import ArticleList from './components/ArticleList.jsx'

export default function App() {
  const { feeds, addFeed, removeFeed } = useFeeds()
  const { articles, feedErrors, loading, lastUpdated, refresh } = useArticles(feeds)
  const { posted, markPosted, unmarkPosted } = usePosted()
  const [showFeeds, setShowFeeds] = useState(true)

  return (
    <div className="app">
      <header className="app-header">
        <h1>RSS-X</h1>
        <div className="header-actions">
          <button type="button" onClick={() => setShowFeeds((v) => !v)}>
            {showFeeds ? 'フィード管理を閉じる' : 'フィード管理'}
          </button>
          <button type="button" onClick={refresh} disabled={loading}>
            {loading ? '更新中…' : '更新'}
          </button>
        </div>
      </header>

      {showFeeds && (
        <section className="feed-section">
          <FeedManager
            feeds={feeds}
            addFeed={addFeed}
            removeFeed={removeFeed}
            feedErrors={feedErrors}
          />
        </section>
      )}

      <div className="status-line">
        {lastUpdated && <span>最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}</span>}
      </div>

      <main>
        <ArticleList
          articles={articles}
          posted={posted}
          markPosted={markPosted}
          unmarkPosted={unmarkPosted}
        />
      </main>
    </div>
  )
}
