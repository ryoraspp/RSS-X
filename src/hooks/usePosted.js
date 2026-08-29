import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'rssx.posted'

function loadPosted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function usePosted() {
  const [posted, setPosted] = useState(loadPosted)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...posted]))
  }, [posted])

  const markPosted = useCallback((articleKey) => {
    setPosted((prev) => new Set(prev).add(articleKey))
  }, [])

  const unmarkPosted = useCallback((articleKey) => {
    setPosted((prev) => {
      const next = new Set(prev)
      next.delete(articleKey)
      return next
    })
  }, [])

  return { posted, markPosted, unmarkPosted }
}
