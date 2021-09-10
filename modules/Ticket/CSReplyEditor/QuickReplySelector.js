import React, { useCallback } from 'react'
import { Button, ListGroup, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import * as Icon from 'react-bootstrap-icons'
import PropTypes from 'prop-types'
import { useToggle } from 'react-use'

import { http } from '../../../lib/leancloud'
import styles from './index.module.scss'

const QuickReplyContent = React.memo(({ onSelected }) => {
  const { t } = useTranslation()
  const { data: quickReplies, isLoading } = useQuery({
    queryKey: 'quickReplies',
    staleTime: 5 * 60 * 1000,
    queryFn: () => http.get('/api/1/quick-replies'),
  })
  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title> {t('ticket.quickReplay.choice')}</Modal.Title>
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
                      onClick={() => onSelected({ content, fileIds: file_ids })}
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
    </>
  )
})

export function QuickReplySelector({ onChange }) {
  const { t } = useTranslation()
  const [show, toggle] = useToggle(false)
  const handleSelect = useCallback(
    (data) => {
      onChange(data)
      toggle(false)
    },
    [toggle, onChange]
  )
  return (
    <>
      <Button variant="light" onClick={toggle}>
        {t('ticket.quickReplay.insert')}
      </Button>
      <Modal show={show} onHide={toggle}>
        <QuickReplyContent onSelected={handleSelect} />
      </Modal>
    </>
  )
}
QuickReplySelector.propTypes = {
  onChange: PropTypes.func.isRequired,
}
