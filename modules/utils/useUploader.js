import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { storage, http } from '../../lib/leancloud'
import { Uploader } from '../components/Uploader'

export function useUploader({ defaultFileIds } = {}) {
  const [files, setFiles] = useState([])
  const $nextKey = useRef(0)

  useEffect(() => {
    if (!defaultFileIds || defaultFileIds.length === 0) {
      return
    }
    setFiles((current) => [
      ...current,
      ...defaultFileIds.map((id) => ({
        id,
        key: $nextKey.current++,
        name: 'loading',
        preset: true,
      })),
    ])
    http
      .get('/api/1/files', { params: { id: defaultFileIds.join(',') } })
      .then((data) => {
        setFiles((current) => {
          const next = [...current]
          data.forEach((file) => {
            const index = next.findIndex(({ id }) => id === file.id)
            if (index !== -1) {
              next[index] = {
                ...next[index],
                name: file.name,
                url: file.url,
                mime: file.mime,
              }
            }
          })
          return next
        })
        return
      })
      .catch(console.error)

    return () => {
      setFiles((current) => current.filter(({ id }) => !defaultFileIds.includes(id)))
    }
  }, [defaultFileIds])

  const onUpload = useCallback((files) => {
    files.forEach((file) => {
      const key = $nextKey.current++
      setFiles((current) => current.concat({ key, name: file.name, progress: 0 }))
      const update = (data) => {
        setFiles((current) => {
          const index = current.findIndex((file) => key === file.key)
          if (index === -1) {
            return current
          }
          const next = [...current]
          next[index] = { ...next[index], ...data }
          return next
        })
      }
      storage
        .upload(file.name, file, {
          onProgress: ({ loaded, total }) => {
            update({ progress: (loaded / total) * 100 })
          },
        })
        .then((file) =>
          update({
            progress: undefined,
            id: file.id,
            name: file.name,
            mime: file.mime,
            url: file.url,
          })
        )
        .catch((error) => {
          console.error(error)
          update({ error, progress: undefined })
        })
    })
  }, [])

  const onRemove = useCallback((file) => {
    if (!file.preset && file.progress === undefined) {
      http.delete(`/api/1/files/${file.id}`).catch(console.error)
    }
    setFiles((current) => current.filter(({ id }) => id !== file.id))
  }, [])

  const uploader = useMemo(() => {
    return React.createElement(Uploader, { files, onUpload, onRemove })
  }, [files, onUpload, onRemove])

  const [fileIds, isUploading, hasError] = useMemo(() => {
    const fileIds = []
    let isUploading = false
    let hasError = false
    files.forEach((file) => {
      if (file.error) {
        hasError = true
        return
      }
      if (file.progress !== undefined) {
        isUploading = true
        return
      }
      if (file.id) {
        fileIds.push(file.id)
      }
    })
    return [fileIds, isUploading, hasError]
  }, [files])

  const clear = useCallback(() => setFiles([]), [])

  return { uploader, fileIds, isUploading, hasError, clear }
}
