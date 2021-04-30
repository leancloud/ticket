import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FormControl } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import Stackedit from 'stackedit-js'
import * as Icon from 'react-bootstrap-icons'
import css from './index.css'
import { uploadFiles } from '../../common'

export default function TextareaWithPreview({ value, onChange, ...props }) {
  const { t } = useTranslation()
  const $input = useRef(null)
  const $editor = useRef(new Stackedit())
  const $value = useRef(value)
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    $value.current = value
  }, [value])

  useLayoutEffect(() => {
    const pasteListener = async ({ clipboardData }) => {
      if (clipboardData.files.length === 0) {
        return
      }
      setDisabled(true)
      try {
        const files = await uploadFiles(clipboardData.files)
        const img = `<img src="${files[0].url}" />`
        const newValue = $value.current ? `${$value.current}\n${img}` : img
        onChange(newValue)
        $input.current.focus()
      } finally {
        setDisabled(false)
      }
    }
    $input.current.addEventListener('paste', pasteListener)
    return () => {
      $input.current.removeEventListener('paste', pasteListener)
    }
  }, [onChange])

  useEffect(() => {
    const fileChangeListener = (file) => onChange(file.content.text)
    $editor.current.on('fileChange', fileChangeListener)
    return () => {
      $editor.current.off('fileChange', fileChangeListener)
    }
  }, [onChange])

  useEffect(() => {
    $editor.current.on('close', () => $input.current.focus())
  }, [])

  const enterPreviewMode = useCallback(() => {
    $editor.current.openFile({
      content: {
        text: $value.current,
      },
    })
  }, [])

  const handleChangeContent = useCallback(
    (e) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  return (
    <div className={css.textareaWrapper}>
      <FormControl
        {...props}
        as="textarea"
        value={value}
        onChange={handleChangeContent}
        ref={$input}
        disabled={disabled}
      />
      <div className={css.preview} title={t('preview')} onClick={enterPreviewMode}>
        <Icon.ArrowsFullscreen />
      </div>
    </div>
  )
}

TextareaWithPreview.propTypes = {
  value: PropTypes.any,
  onChange: PropTypes.func,
}
