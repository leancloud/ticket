import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Form, Breadcrumb } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Link, useHistory } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useMutation, useQueryClient } from 'react-query'
import { auth, http } from '../../../lib/leancloud'
import { useUploader } from '../../utils/useUploader'
import { DocumentTitle } from '../../utils/DocumentTitle'

export function QuickReplyForm({ initValue, onSubmit, onCancel, ...props }) {
  const { t } = useTranslation()
  const [name, setName] = useState(initValue?.name || '')
  const [permission, setPermission] = useState(initValue?.owner_id ? 'ONLY_ME' : 'EVERYONE')
  const [content, setContent] = useState(initValue?.content || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const $unmounted = useRef(false)
  useEffect(
    () => () => {
      $unmounted.current = true
    },
    []
  )
  const { uploader, fileIds, isUploading, hasError } = useUploader({
    defaultFileIds: initValue?.file_ids,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      name: name.trim(),
      content: content.trim(),
      owner_id: permission === 'ONLY_ME' ? auth.currentUser.id : '',
      file_ids: fileIds,
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
        <Form.Control value={name} required onChange={(e) => setName(e.target.value)} />
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
          <option value="EVERYONE">{t('quickReply.everyone')}</option>
          <option value="ONLY_ME">{t('quickReply.onlyMe')}</option>
        </Form.Control>
        <Form.Text muted>{t('quickReply.permissionHint')}</Form.Text>
      </Form.Group>

      <hr />
      <Form.Group controlId="quickReply.content">
        <Form.Label>
          <span className="text-danger">*</span>
          {t('content')}
        </Form.Label>
        <Form.Control
          required
          as="textarea"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </Form.Group>

      {uploader}

      <div className="d-flex flex-row-reverse">
        <Button variant="primary" type="submit" disabled={isSubmitting || isUploading || hasError}>
          {t('save')}
        </Button>
        <Button
          className="mr-1"
          variant="link"
          disabled={isSubmitting || isUploading || hasError}
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
  const { t } = useTranslation()
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
      <DocumentTitle title={`${t('quickReply')}`} />
      <Breadcrumb>
        <Breadcrumb.Item linkProps={{ to: '/settings/quick-replies' }} linkAs={Link}>
          {t('quickReply.list')}
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{t('newQuickReply')}</Breadcrumb.Item>
      </Breadcrumb>
      <QuickReplyForm className="mt-2" onSubmit={mutateAsync} onCancel={backToList} />
    </>
  )
}
