import React, { useCallback, useState } from 'react'
import { Button, ListGroup, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import * as Icon from 'react-bootstrap-icons'
import PropTypes from 'prop-types'

import { http } from '../../../lib/leancloud'
import styles from './index.module.scss'

export function QuickReplySelector({ onChange }) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const toggleShow = useCallback(() => setShow((current) => !current), [])

  const { data: quickReplies, isLoading } = useQuery({
    queryKey: 'quickReplies',
    queryFn: () => http.get('/api/1/quick-replies').then((res) => res.data),
  })

  const handleSelect = useCallback(
    (data) => {
      onChange(data)
      setShow(false)
    },
    [onChange]
  )

  return (
    <>
      <Button variant="light" onClick={toggleShow}>
        Insert quick reply
      </Button>
      <Modal show={show} onHide={toggleShow}>
        <Modal.Header closeButton>
          <Modal.Title>Choose a quick reply</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          <ListGroup className={styles.quickReplyList} variant="flush">
            {isLoading ? (
              <ListGroup.Item>{t('loading') + '...'}</ListGroup.Item>
            ) : (
              quickReplies.map(({ id, name, content, file_ids }) => (
                <ListGroup.Item className="d-flex" key={id}>
                  <div className="mr-auto">
                    <OverlayTrigger placement="right" overlay={<Tooltip>{content}</Tooltip>}>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleSelect({ content, fileIds: file_ids })}
                      >
                        {name}
                      </Button>
                    </OverlayTrigger>
                  </div>
                  {file_ids.length > 0 && (
                    <div className="d-flex align-items-center">
                      <Icon.FileEarmark className="mr-1" />
                      {file_ids.length}
                    </div>
                  )}
                </ListGroup.Item>
              ))
            )}
          </ListGroup>
        </Modal.Body>
      </Modal>
    </>
  )
}
QuickReplySelector.propTypes = {
  onChange: PropTypes.func.isRequired,
}
