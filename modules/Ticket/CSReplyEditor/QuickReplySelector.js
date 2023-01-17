import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormControl, ListGroup, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import * as Icon from 'react-bootstrap-icons'
import PropTypes from 'prop-types'
import { useToggle } from 'react-use'

import { http } from 'lib/leancloud'
import { useAppContext } from 'modules/context'
import styles from './index.module.scss'

const useFilterQuickReplies = (keyword, quickReplies) => {
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedKeyword(keyword), 500)
    return () => clearTimeout(id)
  }, [keyword])

  return useMemo(() => {
    const keyword = debouncedKeyword.trim()

    if (!keyword || !quickReplies) {
      return quickReplies
    }

    return quickReplies.filter(({ name, content }) => {
      return name.includes(keyword) || content.includes(keyword)
    })
  }, [debouncedKeyword, quickReplies])
}

const QuickReplyContent = React.memo(({ onSelected }) => {
  const { t } = useTranslation()

  const { currentUser } = useAppContext()
  const { data: quickReplies, isLoading } = useQuery({
    queryKey: 'quickReplies',
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      http.get('/api/2/quick-replies', {
        params: {
          userId: [currentUser.id, 'null'].join(','),
          pageSize: 1000,
        },
      }),
  })

  const [keyword, setKeyword] = useState('')
  const filteredQuickReplies = useFilterQuickReplies(keyword, quickReplies)

  if (isLoading) {
    return <div className="p-4">{t('loading') + '...'}</div>
  }

  return (
    <>
      <div className={styles.searchQuickReply}>
        <FormControl
          autoFocus
          placeholder="Search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      {filteredQuickReplies.length === 0 && <div className="p-4">No data</div>}
      <ListGroup className={styles.quickReplyList} variant="flush">
        {filteredQuickReplies.map(({ id, name, content, fileIds }) => (
          <ListGroup.Item className="d-flex" key={id}>
            <div className="mr-auto">
              <OverlayTrigger placement="right" overlay={<Tooltip>{content}</Tooltip>}>
                <Button variant="link" size="sm" onClick={() => onSelected({ content, fileIds })}>
                  {name}
                </Button>
              </OverlayTrigger>
            </div>
            {fileIds?.length > 0 && (
              <div className="d-flex align-items-center">
                <Icon.FileEarmark className="mr-1" />
                {fileIds.length}
              </div>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>
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
      <Modal contentClassName={styles.quickReplyModal} show={show} onHide={toggle}>
        <Modal.Header closeButton>
          <Modal.Title>{t('ticket.quickReplay.choice')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <QuickReplyContent onSelected={handleSelect} />
        </Modal.Body>
      </Modal>
    </>
  )
}
QuickReplySelector.propTypes = {
  onChange: PropTypes.func.isRequired,
}
