import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'

import { useUploader } from '../utils/useUploader'
import { uploadFile } from './CSReplyEditor'
import { MarkdownEditor } from './CSReplyEditor/MarkdownEditor'

export const EditReplyModal = forwardRef(({ isSaving, onSave }, ref) => {
  const [show, setShow] = useState(false)
  const [id, setId] = useState()
  const [content, setContent] = useState('')
  const [defaultFileIds, setDefaultFileIds] = useState([])

  const { uploader, fileIds, isUploading, hasError, clear } = useUploader({ defaultFileIds })

  useImperativeHandle(ref, () => ({
    show: (data) => {
      setShow(true)
      setId(data.id)
      setContent(data.content)
      clear()
      setDefaultFileIds(data.file_ids?.slice())
    },
    hide: () => setShow(false),
  }))

  const handleClose = useCallback(() => {
    if (!isSaving) {
      setShow(false)
    }
  }, [isSaving])

  return (
    <Modal centered size="lg" show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Edit reply</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <MarkdownEditor value={content} onChange={setContent} onPasteFile={uploadFile} />
        {uploader}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={isSaving || isUploading || hasError}
          onClick={() => onSave({ id, content, fileIds })}
        >
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  )
})
