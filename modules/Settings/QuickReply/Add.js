import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import { useTranslation } from 'react-i18next'
import { Link, useHistory } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useMutation, useQueryClient } from 'react-query'

import styles from './index.module.scss'
import { auth, http } from '../../../lib/leancloud'
import { Uploader } from '../../components/Uploader'

export function QuickReplyForm({ initValue, onSubmit, onCancel, ...props }) {
  const { t } = useTranslation()
  const [name, setName] = useState(initValue?.name || '')
  const [nameErrorMessage, setNameErrorMessage] = useState('')
  const $nameInput = useRef()
  const [permission, setPermission] = useState(initValue?.owner_id ? 'ONLY_ME' : 'EVERYONE')
  const [content, setContent] = useState(initValue?.content || '')
  const [contentErrorMessage, setContentErrorMessage] = useState('')
  const $contentInput = useRef()
  const [uploadedFileIds, setUploadedFileIds] = useState(initValue?.file_ids || [])
  const [newFileIds, setNewFileIds] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const $unmounted = useRef(false)
  const $newFileIds = useRef(newFileIds)
  useEffect(
    () => () => {
      $unmounted.current = true
      $newFileIds.current.forEach((id) => http.delete(`/api/1/files/${id}`))
    },
    []
  )

  $newFileIds.current = newFileIds

  const nameIsValid = () => {
    if (name.trim()) {
      setNameErrorMessage('')
      return true
    }
    setNameErrorMessage('Name cannot be empty')
    return false
  }

  const contentIsValid = () => {
    if (content.trim()) {
      setContentErrorMessage('')
      return true
    }
    setContentErrorMessage('Content cannot be empty')
    return false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nameIsValid()) {
      $nameInput.current.focus()
      return
    }
    if (!contentIsValid()) {
      $contentInput.current.focus()
      return
    }

    const data = {
      name: name.trim(),
      content: content.trim(),
      owner_id: permission === 'ONLY_ME' ? auth.currentUser.id : '',
      file_ids: uploadedFileIds.concat(newFileIds),
    }
    setIsSubmitting(true)
    // eslint-disable-next-line promise/catch-or-return
    Promise.resolve(onSubmit(data)).finally(() => {
      if (!$unmounted.current) {
        setIsSubmitting(false)
      }
    })
  }

  return (
    <Form {...props} onSubmit={handleSubmit}>
      <Form.Group controlId="quickReply.name">
        <Form.Label>
          <span className="text-danger">*</span>
          {t('name')}
        </Form.Label>
        <Form.Control
          ref={$nameInput}
          value={name}
          isInvalid={nameErrorMessage !== ''}
          onChange={(e) => setName(e.target.value)}
          onBlur={nameIsValid}
        />
        <Form.Control.Feedback type="invalid">{nameErrorMessage}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group controlId="quickReply.privilege">
        <Form.Label>
          <span className="text-danger">*</span>
          {t('permission')}
        </Form.Label>
        <Form.Control
          as="select"
          value={permission}
          onChange={(e) => setPermission(e.target.value)}
        >
          <option value="EVERYONE">Everyone</option>
          <option value="ONLY_ME">Only me</option>
        </Form.Control>
        <Form.Text muted>Who can use this quick reply</Form.Text>
      </Form.Group>

      <hr />
      <Form.Group controlId="quickReply.content">
        <Form.Label>
          <span className="text-danger">*</span>Content
        </Form.Label>
        <Form.Control
          ref={$contentInput}
          as="textarea"
          rows={5}
          value={content}
          isInvalid={contentErrorMessage !== ''}
          onChange={(e) => setContent(e.target.value)}
          onBlur={contentIsValid}
        />
        <Form.Control.Feedback type="invalid">{contentErrorMessage}</Form.Control.Feedback>
      </Form.Group>

      <Uploader
        uploadedFileIds={uploadedFileIds}
        onRemoveUploadedFile={(id) =>
          setUploadedFileIds((current) => current.filter((_id) => _id !== id))
        }
        onChange={(files) => {
          if (files.find((file) => file.isUploading)) {
            setIsUploading(true)
          } else {
            setNewFileIds(files.map((file) => file.id))
            setIsUploading(false)
          }
        }}
      />

      <div className="d-flex flex-row-reverse">
        <Button variant="primary" type="submit" disabled={isSubmitting || isUploading}>
          {t('save')}
        </Button>
        <Button
          className="mr-1"
          variant="link"
          disabled={isSubmitting || isUploading}
          onClick={onCancel}
        >
          {t('cancel')}
        </Button>
      </div>
    </Form>
  )
}
QuickReplyForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  initValue: PropTypes.shape({
    name: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  }),
}

export function AddQuickReply() {
  const queryClient = useQueryClient()
  const history = useHistory()
  const backToList = useCallback(() => history.push('/settings/quick-replies'), [history])

  const { mutateAsync } = useMutation({
    mutationFn: (data) => http.post('/api/1/quick-replies', data),
    onSuccess: () => {
      queryClient.invalidateQueries('quickReplies')
      backToList()
    },
  })

  return (
    <>
      <h1 className={styles.title}>
        <Link className="mr-2" to="/settings/quick-replies">
          <Icon.ChevronLeft />
        </Link>
        Add quick reply
      </h1>
      <QuickReplyForm className="mt-2" onSubmit={mutateAsync} onCancel={backToList} />
    </>
  )
}
