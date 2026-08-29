import { buildIntentUrl, buildTweetText } from '../utils/x.js'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ArticleCard({ article, isPosted, onPost, onUnpost }) {
  const tweetText = buildTweetText(article)

  function handlePostClick() {
    window.open(buildIntentUrl(tweetText), '_blank', 'noopener,noreferrer')
    onPost(article.key)
  }

  return (
    <article className={`article-card${isPosted ? ' is-posted' : ''}`}>
      <div className="article-meta">
        <span className="article-feed">{article.feedTitle}</span>
        <span className="article-date">{formatDate(article.pubDate)}</span>
      </div>
      <h2 className="article-title">
        <a href={article.link} target="_blank" rel="noopener noreferrer">
          {article.title}
        </a>
      </h2>
      {article.contentSnippet && <p className="article-snippet">{article.contentSnippet}</p>}
      <div className="article-actions">
        <button type="button" className="btn-post" onClick={handlePostClick}>
          𝕏 に投稿
        </button>
        {isPosted && (
          <button type="button" className="btn-unpost" onClick={() => onUnpost(article.key)}>
            投稿済みを解除
          </button>
        )}
        {isPosted && <span className="posted-badge">投稿済み</span>}
      </div>
    </article>
  )
}
