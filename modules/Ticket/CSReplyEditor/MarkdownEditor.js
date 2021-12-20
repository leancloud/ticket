import React, { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Tab, Tabs } from 'react-bootstrap'
import Remarkable from 'remarkable'
import hljs from 'highlight.js'

import style from './index.module.scss'

const md = new Remarkable({
  html: true,
  breaks: true,
  linkify: true,
  typographer: false,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value
      } catch (err) {
        // ignore
      }
    }
    try {
      return hljs.highlightAuto(str).value
    } catch (err) {
      // ignore
    }
    return '' // use external default escaping
  },
})

function resize(element) {
  element.style.height = 'auto'
  const height = element.scrollHeight
  element.style.height = height + 'px'
  return height
}

function useAutoResize() {
  const $height = useRef(0)
  const callbackRef = useCallback((element) => {
    if (!element) {
      return
    }
    $height.current = resize(element)
    element.addEventListener('input', (e) => {
      $height.current = resize(e.target)
    })
  }, [])

  return { ref: callbackRef, height: $height.current }
}

export function MarkdownEditor({ value, onChange, onPasteFile, onKeyDown }) {
  const [activeKey, setActiveKey] = useState('editor')
  const [html, setHtml] = useState('')
  const { ref, height } = useAutoResize()

  useEffect(() => {
    if (activeKey === 'preview') {
      setHtml(md.render(value))
    }
  }, [value, activeKey])

  const handlePaste = async (e) => {
    const files = e.clipboardData.files
    if (files.length === 0 || !onPasteFile) {
      return
    }
    const file = files[0]
    const { selectionStart, selectionEnd } = e.target
    const placeholder = `![${file.name}](uploading)`
    onChange(value.slice(0, selectionStart) + placeholder + value.slice(selectionEnd))
    const url = await onPasteFile(file)
    onChange(
      value.slice(0, selectionStart) +
        `![${file.name}](${url})` +
        value.slice(selectionStart + placeholder.length)
    )
  }

  return (
    <Tabs activeKey={activeKey} onSelect={setActiveKey}>
      <Tab eventKey="editor" title="Write">
        <textarea
          ref={ref}
          className={style.editor}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={onKeyDown}
        />
      </Tab>
      <Tab eventKey="preview" title="Preview">
        <div
          className={`${style.preview} markdown-body`}
          style={{ minHeight: Math.max(height, 200) + 6 }}
          dangerouslySetInnerHTML={{ __html: html || 'Nothing to preview' }}
        />
      </Tab>
    </Tabs>
  )
}

MarkdownEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onPasteFile: PropTypes.func,
  onKeyDown: PropTypes.func,
}
