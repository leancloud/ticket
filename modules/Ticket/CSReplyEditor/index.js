import React, { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import { storage } from '../../../lib/leancloud'
import MarkdownEditor from '../../components/MarkdownEditor'
import { useAutoSave } from '../../utils/useAutoSave'
import styles from './index.module.scss'

function ReplyType({ value, onChange }) {
  const handleChangeReplyType = (e) => onChange(e.target.value)
  return (
    <>
      <Form.Check
        inline
        type="radio"
        id="reply-type-public"
        label="Public"
        value="public"
        checked={value === 'public'}
        onChange={handleChangeReplyType}
      />
      <Form.Check
        inline
        type="radio"
        id="reply-type-internal"
        label="Internal"
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

async function uploadFile(file) {
  const LCFile = await storage.upload(file.name, file)
  return LCFile.url
}

export function CSReplyEditor({ ticketId, onReply, onOperate }) {
  const { t } = useTranslation()
  const [replyType, setReplyType] = useState('public')
  const [content, setContent] = useAutoSave(`ticket:${ticketId}:reply`)
  const [operating, setOperating] = useState(false)
  const [committing, setCommitting] = useState(false)
  const commitable = useMemo(() => content.trim().length > 0, [content])

  const handleReply = async () => {
    if (!commitable || committing) {
      return
    }
    setCommitting(true)
    try {
      await onReply({ content, internal: replyType === 'internal' })
      setContent('')
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
      <div className="mx-3">
        <ReplyType value={replyType} onChange={setReplyType} />
      </div>

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

      <div className="d-flex flex-row-reverse mt-2">
        <Button
          className={`${styles.submit} ml-2`}
          variant="success"
          disabled={!commitable || committing}
          onClick={handleReply}
        >
          {t('submit')}
        </Button>
        <Button
          className="ml-2"
          variant="light"
          disabled={operating}
          onClick={() => handleOperate('replySoon')}
        >
          {t('replyLater')}
        </Button>
        <Button
          variant="light"
          disabled={operating}
          onClick={() => handleOperate('replyWithNoContent')}
        >
          {t('noNeedToReply')}
        </Button>
      </div>
    </div>
  )
}
CSReplyEditor.propTypes = {
  ticketId: PropTypes.string.isRequired,
  onReply: PropTypes.func.isRequired,
  onOperate: PropTypes.func.isRequired,
}
