import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { Button, Card, Modal } from 'react-bootstrap'
import { useQuery } from 'react-query'

import { http } from 'lib/leancloud'
import { UserLabel } from 'modules/UserLabel'
import { ReplyContent } from './ReplyCard'
import { Time } from './Time'

export const ReplyRevisionsModal = forwardRef((props, ref) => {
  const [show, setShow] = useState(false)
  const [id, setId] = useState()

  useImperativeHandle(ref, () => ({
    show: (replyId) => {
      setShow(true)
      setId(replyId)
    },
    hide: () => setShow(false),
  }))

  const { data, isLoading } = useQuery({
    queryKey: ['ReplyRevisions', id],
    queryFn: () => http.get(`/api/2/replies/${id}/revisions`),
    enabled: !!id,
  })

  return (
    <Modal size="lg" show={show} onHide={() => setShow(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Reply revisions</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{}}>
        {isLoading && 'Loading...'}
        {data?.map((revision) => (
          <Card className="p-2">
            <div className="d-flex mb-2">
              <UserLabel user={revision.operator} />
              <div className="mx-2">
                {revision.action === 'create' && 'created at'}
                {revision.action === 'update' && 'updated at'}
                {revision.action === 'delete' && 'deleted at'}
              </div>
              <Time value={revision.actionTime} />
            </div>
            <ReplyContent>{revision.contentSafeHTML}</ReplyContent>
          </Card>
        ))}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShow(false)}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
})
