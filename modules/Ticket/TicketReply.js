import React, { useContext, useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'

import TextareaWithPreview from '../components/TextareaWithPreview'
import css from './index.css'
import { useMutation } from 'react-query'
import { commitTicketReply, operateTicket } from './hooks'
import { uploadFiles } from '../common'
import { AppContext } from '../context'

export default function TicketReply({ ticket, isCustomerService }) {
  const { t } = useTranslation()
  const { addNotification } = useContext(AppContext)
  const [content, setContent] = useState(localStorage.getItem(`ticket:${ticket.nid}:reply`) || '')
  const $fileInput = useRef()
  const [committing, setCommitting] = useState(false)
  useEffect(() => {
    localStorage.setItem(`ticket:${ticket.nid}:reply`, content)
  }, [ticket.nid, content])

  const { mutate: commitReply } = useMutation(
    ({ nid, content, files }) => commitTicketReply(nid, content, files),
    {
      onMutate: () => setCommitting(true),
      onSuccess: (res, { nid }) => {
        setContent('')
        localStorage.removeItem(`ticket:${nid}:reply`)
        $fileInput.current.value = ''
      },
      onSettled: () => setCommitting(false),
    }
  )

  const handleCommit = async () => {
    const trimedContent = content.trim()
    const files = $fileInput.current.files
    if (!trimedContent && files.length === 0) {
      return
    }
    try {
      setCommitting(true)
      const uploadedFiles = await uploadFiles(files)
      commitReply({
        nid: ticket.nid,
        content: trimedContent,
        files: uploadedFiles.map((file) => ({ objectId: file.id })),
      })
    } catch (error) {
      addNotification(error)
    } finally {
      setCommitting(false)
    }
  }

  const handleOperateTicket = async (action) => {
    try {
      setCommitting(true)
      await operateTicket(ticket.nid, action)
    } catch (error) {
      addNotification(error)
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
          onKeyDown={(e) => e.metaKey && e.keyCode === 13 && handleCommit()}
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
                onClick={() => handleOperateTicket('replyWithNoContent')}
                disabled={committing}
              >
                {t('noNeedToReply')}
              </Button>{' '}
              <Button
                variant="light"
                onClick={() => handleOperateTicket('replySoon')}
                disabled={committing}
              >
                {t('replyLater')}
              </Button>{' '}
            </>
          )}
          <Button
            className={css.submit}
            variant="success"
            onClick={handleCommit}
            disabled={committing}
          >
            {t('submit')}
          </Button>
        </div>
      </Form.Group>
    </Form>
  )
}

TicketReply.propTypes = {
  ticket: PropTypes.shape({
    objectId: PropTypes.string.isRequired,
  }).isRequired,
  isCustomerService: PropTypes.bool,
}
