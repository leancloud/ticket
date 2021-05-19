import React, { useCallback, useContext, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import TextareaWithPreview from '../components/TextareaWithPreview'
import css from './index.css'
import { useMutation } from 'react-query'
import { fetch } from '../../lib/leancloud'
import { uploadFiles } from '../common'
import { AppContext } from '../context'

export function TicketReply({ ticket, isCustomerService, onCommitted, onOperate }) {
  const { t } = useTranslation()
  const { addNotification } = useContext(AppContext)
  const storageKey = `ticket:${ticket.id}:reply`
  const [content, setContent] = useState(localStorage.getItem(storageKey) ?? '')
  const $fileInput = useRef()
  const [operating, setOperating] = useState(false)

  const setReplyContent = useCallback(
    (content) => {
      setContent(content)
      if (content) {
        localStorage.setItem(storageKey, content)
      } else {
        localStorage.removeItem(storageKey)
      }
    },
    [storageKey]
  )

  const { mutate: commit, isLoading: committing } = useMutation({
    mutationFn: async ({ content, files }) => {
      let file_ids = undefined
      if (files?.length) {
        file_ids = (await uploadFiles(files)).map((file) => file.id)
      }
      await fetch(`/api/1/tickets/${ticket.id}/replies`, {
        method: 'POST',
        body: { content, file_ids },
      })
    },
    onSuccess: (reply) => {
      setReplyContent('')
      $fileInput.current.value = ''
      onCommitted?.(reply)
    },
    onError: (error) => addNotification(error),
  })

  const operate = async (action) => {
    setOperating(true)
    try {
      await onOperate(action)
    } finally {
      setOperating(false)
    }
  }

  return (
    <Form>
      <Form.Group>
        <TextareaWithPreview
          rows="8"
          value={content}
          onChange={setReplyContent}
          onKeyDown={(e) => {
            if (e.metaKey && e.keyCode == 13) {
              commit({ content, files: $fileInput.current.files })
            }
          }}
        />
      </Form.Group>

      <Form.Group>
        <Form.Control type="file" multiple ref={$fileInput} />
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
          {isCustomerService && (
            <>
              <Button
                variant="light"
                disabled={operating}
                onClick={() => operate('replyWithNoContent')}
              >
                {t('noNeedToReply')}
              </Button>{' '}
              <Button variant="light" disabled={operating} onClick={() => operate('replySoon')}>
                {t('replyLater')}
              </Button>{' '}
            </>
          )}
          <Button
            className={css.submit}
            variant="success"
            disabled={committing}
            onClick={() => commit({ content, files: $fileInput.current.files })}
          >
            {t('submit')}
          </Button>
        </div>
      </Form.Group>
    </Form>
  )
}
TicketReply.propTypes = {
  ticket: PropTypes.object.isRequired,
  isCustomerService: PropTypes.bool,
  onCommitted: PropTypes.func,
  onOperate: PropTypes.func,
}
