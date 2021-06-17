import React, { useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import MDEditor from '@uiw/react-md-editor'

import './index.module.scss'

export default function MarkdownEditor({ value, onChange, onPasteFile, onPaste, onKeyDown }) {
  const $value = useRef(value)
  const $onPaste = useRef(handlePaste)
  const $onKeyDown = useRef(onKeyDown)

  const handlePaste = useCallback(
    async (e) => {
      onPaste?.(e)

      const files = e.clipboardData.files
      if (files.length && onPasteFile) {
        const file = files[0]
        const { selectionStart, selectionEnd } = e.target
        const placeholder = `![${file.name}](uploading)`
        onChange(
          $value.current.slice(0, selectionStart) + placeholder + $value.current.slice(selectionEnd)
        )
        const url = await onPasteFile(file)
        onChange(
          $value.current.slice(0, selectionStart) +
            `![${file.name}](${url})` +
            $value.current.slice(selectionStart + placeholder.length)
        )
      }
    },
    [onPaste, onChange, onPasteFile]
  )

  $value.current = value

  // 因为 react-md-editor (至少是 v3.3.6) 解构并缓存了 textareaProps, 并且整个生命周期内都不再更新
  // 所以需要包装一下, 改成正常组件的行为
  $onPaste.current = handlePaste
  $onKeyDown.current = onKeyDown

  return (
    <MDEditor
      value={value}
      onChange={onChange}
      preview="edit"
      textareaProps={{
        onPaste: (...args) => $onPaste.current(...args),
        onKeyDown: (...args) => $onKeyDown.current(...args),
      }}
    />
  )
}
MarkdownEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onPasteFile: PropTypes.func,
  onPaste: PropTypes.func,
  onKeyDown: PropTypes.func,
}
