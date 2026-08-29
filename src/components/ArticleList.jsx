import { useState } from 'react'
import ArticleCard from './ArticleCard.jsx'

export default function ArticleList({ articles, posted, markPosted, unmarkPosted }) {
  const [hidePosted, setHidePosted] = useState(false)

  const visible = hidePosted ? articles.filter((a) => !posted.has(a.key)) : articles

  return (
    <div className="article-list-wrap">
      <div className="article-list-toolbar">
        <label>
          <input
            type="checkbox"
            checked={hidePosted}
            onChange={(e) => setHidePosted(e.target.checked)}
          />
          投稿済みを非表示
        </label>
        <span className="article-count">{visible.length}件</span>
      </div>
      <div className="article-list">
        {visible.map((article) => (
          <ArticleCard
            key={article.key}
            article={article}
            isPosted={posted.has(article.key)}
            onPost={markPosted}
            onUnpost={unmarkPosted}
          />
        ))}
        {visible.length === 0 && <p className="article-empty">表示する記事がありません</p>}
      </div>
    </div>
  )
}
