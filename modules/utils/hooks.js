import { useEffect, useRef } from 'react'

export function useTitle(title) {
  const previousTitle = useRef(document.title)
  useEffect(() => {
    document.title = title
    return () => (document.title = previousTitle.current)
  }, [title])
}
