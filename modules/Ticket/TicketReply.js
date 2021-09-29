import React, { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import TextareaWithPreview from '../components/TextareaWithPreview'
import css from './index.css'
import { uploadFiles } from '../common'
import { useAutoSave } from '../utils/useAutoSave'

export function TicketReply({ ticketId, onReply }) {
  const { t } = useTranslation()
  const [content, setContent] = useAutoSave(`ticket:${ticketId}:reply`)
  const [files, setFiles] = useState([])
  const $fileInput = useRef()
  const commitable = useMemo(() => content.trim().length > 0 || files.length > 0, [content, files])
  const [committing, setCommitting] = useState(false)

  const handleReply = async () => {
    setCommitting(true)
    try {
      const data = { content }
      if (files.length) {
        data.fileIds = (await uploadFiles(files)).map((file) => file.id)
      }
      await onReply(data)
      setContent('')
      setFiles([])
      $fileInput.current.value = null
    } finally {
      setCommitting(false)
    }
  }

  return (
    <Form>
      <Form.Group>
        <TextareaWithPreview
          rows="8"
          value={content}
          onChange={setContent}
          onKeyDown={(e) => {
            if (e.metaKey && e.keyCode === 13 && commitable && !committing) {
              handleReply()
            }
          }}
        />
      </Form.Group>

      <Form.Group>
        <Form.Control
          type="file"
          multiple
          ref={$fileInput}
          onChange={(e) => setFiles(e.target.files)}
        />
        <Form.Text muted>{t('multipleAttachments')}</Form.Text>
      </Form.Group>

      <Form.Group className="d-block d-md-flex">
        <div className="flex-fill">
          <p className={css.markdownTip}>
            <Icon.Markdown />{' '}
            <a href="https://forum.leancloud.cn/t/topic/15412" target="_blank" rel="noopener">
              {t('supportMarkdown')}
            </a>
          </p>
        </div>
        <div>
          <Button
            className={css.submit}
            variant="success"
            disabled={!commitable || committing}
            onClick={handleReply}
          >
            {t('submit')}
          </Button>
        </div>
      </Form.Group>
    </Form>
  )
}
TicketReply.propTypes = {
  ticketId: PropTypes.string.isRequired,
  onReply: PropTypes.func,
}
