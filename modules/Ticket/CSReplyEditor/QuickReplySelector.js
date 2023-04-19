import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormControl, ListGroup, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import * as Icon from 'react-bootstrap-icons'
import PropTypes from 'prop-types'
import { useToggle } from 'react-use'
import Select from 'react-select'
import _ from 'lodash'

import { http } from 'lib/leancloud'
import { useAppContext } from 'modules/context'
import styles from './index.module.scss'

const useFilterQuickReplies = (quickReplies, tag, keyword) => {
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedKeyword(keyword), 500)
    return () => clearTimeout(id)
  }, [keyword])

  const filteredByTag = useMemo(() => {
    if (!tag || !quickReplies) {
      return quickReplies
    }
    return quickReplies.filter((quickReply) => quickReply.tags?.includes(tag))
  }, [quickReplies, tag])

  return useMemo(() => {
    const keyword = debouncedKeyword.trim()

    if (!keyword || !filteredByTag) {
      return filteredByTag
    }

    return filteredByTag.filter(({ name, content }) => {
      return name.includes(keyword) || content.includes(keyword)
    })
  }, [filteredByTag, debouncedKeyword])
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

  const [tag, setTag] = useState(null)
  const [keyword, setKeyword] = useState('')
  const filteredQuickReplies = useFilterQuickReplies(quickReplies, tag?.value, keyword)

  const tagOptions = useMemo(() => {
    if (!quickReplies) {
      return []
    }
    const tags = quickReplies.flatMap((quickReply) => quickReply.tags || [])
    return _.uniq(tags).map((label) => ({ label, value: label }))
  }, [quickReplies])

  if (isLoading) {
    return <div className="p-4">{t('loading') + '...'}</div>
  }

  return (
    <>
      <div className={styles.searchQuickReply}>
        <Select isClearable placeholder="Tag" options={tagOptions} value={tag} onChange={setTag} />
        <FormControl
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
                <a href="javascript:;" onClick={() => onSelected({ content, fileIds })}>
                  {name}
                </a>
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
