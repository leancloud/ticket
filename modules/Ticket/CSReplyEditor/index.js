import React, { useMemo, useState, useContext } from 'react'
import { Button, Form, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import { storage } from '../../../lib/leancloud'
import { useUploader } from '../../utils/useUploader'
import { useAutoSave } from '../../utils/useAutoSave'
import styles from './index.module.scss'
import { MarkdownEditor } from './MarkdownEditor'
import { QuickReplySelector } from './QuickReplySelector'
import { AppContext } from '../../context'

function ReplyType({ value, onChange }) {
  const { t } = useTranslation()
  const handleChangeReplyType = (e) => onChange(e.target.value)
  return (
    <>
      <Form.Check
        inline
        type="radio"
        id="reply-type-public"
        label={t('replyType.public')}
        value="public"
        checked={value === 'public'}
        onChange={handleChangeReplyType}
      />
      <Form.Check
        inline
        type="radio"
        id="reply-type-internal"
        label={t('replyType.internal')}
        value="internal"
        checked={value === 'internal'}
        onChange={handleChangeReplyType}
      />
    </>
  )
}
ReplyType.propTypes = {
  value: PropTypes.oneOf(['public', 'internal']).isRequired,
  onChange: PropTypes.func.isRequired,
}

export async function uploadFile(file) {
  const LCFile = await storage.upload(file.name, file)
  return LCFile.url
}

export function CSReplyEditor({ ticketId, onReply, onOperate }) {
  const { t } = useTranslation()
  const appContextValue = useContext(AppContext)
  const { isCustomerService } = appContextValue
  const [replyType, setReplyType] = useState(isCustomerService ? 'public' : 'internal')
  const [content, setContent] = useAutoSave(`ticket:${ticketId}:reply`)
  const [operating, setOperating] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [defaultFileIds, setDefaultFileIds] = useState([])
  const { uploader, fileIds, isUploading, hasError, clear } = useUploader({ defaultFileIds })
  const commitable = useMemo(() => {
    return content.trim().length > 0 || (fileIds.length > 0 && !isUploading && !hasError)
  }, [content, fileIds, isUploading, hasError])

  const handleReply = async () => {
    if (!commitable || committing) {
      return
    }
    setCommitting(true)
    try {
      await onReply({ content, fileIds, internal: replyType === 'internal' })
      setContent('')
      clear()
    } finally {
      setCommitting(false)
    }
  }

  const handleOperate = async (action) => {
    setOperating(true)
    try {
      await onOperate(action)
    } finally {
      setOperating(false)
    }
  }

  return (
    <div>
      {isCustomerService && (
        <div className="mx-3">
          <ReplyType value={replyType} onChange={setReplyType} />
        </div>
      )}

      <div
        className={classNames(styles.editorContainer, {
          [styles.internal]: replyType === 'internal',
        })}
      >
        <MarkdownEditor
          value={content}
          onChange={setContent}
          onPasteFile={uploadFile}
          onKeyDown={(e) => {
            if (e.metaKey && e.keyCode === 13 && commitable && !committing) {
              handleReply()
            }
          }}
        />
      </div>

      {uploader}

      <div className="d-flex justify-content-between my-2">
        <div>
          {isCustomerService && (
            <QuickReplySelector
              onChange={({ content, fileIds }) => {
                setContent(content)
                clear()
                setDefaultFileIds(fileIds)
              }}
            />
          )}
        </div>

        <div>
          {isCustomerService && (
            <>
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip>
                    {t('changedTicketStatusTo')} {t('statusWaitingCustomer')}
                  </Tooltip>
                }
              >
                <Button
                  variant="light"
                  disabled={operating}
                  onClick={() => handleOperate('replyWithNoContent')}
                >
                  {t('noNeedToReply')}
                </Button>
              </OverlayTrigger>{' '}
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip>
                    {t('changedTicketStatusTo')} {t('statusWaitingCustomerService')}
                  </Tooltip>
                }
              >
                <Button
                  variant="light"
                  disabled={operating}
                  onClick={() => handleOperate('replySoon')}
                >
                  {t('replyLater')}
                </Button>
              </OverlayTrigger>{' '}
            </>
          )}
          <Button
            className={styles.submit}
            variant="success"
            disabled={!commitable || committing}
            onClick={handleReply}
          >
            {replyType === 'public' ? t('replyCustomer') : t('leaveMessage')}
          </Button>
        </div>
      </div>
    </div>
  )
}
CSReplyEditor.propTypes = {
  ticketId: PropTypes.string.isRequired,
  onReply: PropTypes.func.isRequired,
  onOperate: PropTypes.func.isRequired,
}
