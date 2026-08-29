const TWEET_MAX = 280
// URL is always counted as 23 chars by X regardless of actual length.
const X_URL_WEIGHT = 23

export function buildTweetText(article) {
  const title = article.title || ''
  const link = article.link || ''
  const budget = TWEET_MAX - X_URL_WEIGHT - 1 // 1 for the newline before the link
  const trimmedTitle = title.length > budget ? `${title.slice(0, budget - 1)}…` : title
  return link ? `${trimmedTitle}\n${link}` : trimmedTitle
}

export function buildIntentUrl(text) {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`
}
