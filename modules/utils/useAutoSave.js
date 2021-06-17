import { useEffect, useRef, useState } from 'react'

/**
 * @param {string} storageKey
 * @returns {[string, (content: string) => void]}
 */
export function useAutoSave(storageKey) {
  const $storageKey = useRef(storageKey)
  const [content, setContent] = useState(localStorage.getItem(storageKey) || '')
  const $timer = useRef()
  const $saveContent = useRef((content) => {
    setContent(content)
    clearTimeout($timer.current)
    const storageKey = $storageKey.current
    if (content) {
      $timer.current = setTimeout(() => localStorage.setItem(storageKey, content), 1000)
    } else {
      localStorage.removeItem(storageKey)
    }
  })

  useEffect(() => {
    $storageKey.current = storageKey
    setContent(localStorage.getItem(storageKey) || '')
  }, [storageKey])

  return [content, $saveContent.current]
}
