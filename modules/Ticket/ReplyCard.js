import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, Dropdown } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import DOMPurify from 'dompurify'
import _ from 'lodash'
import { useMutation } from 'react-query'
import { http } from 'lib/leancloud'
import Confirm from '../components/Confirm'
import { fetch } from '../../lib/leancloud'
import { AppContext } from '../context'
import css from './index.css'
import { UserLabel } from '../UserLabel'
import { Time } from './Time'
import { InternalBadge } from '../components/InternalBadge'

const IMAGE_FILE_MIMES = ['image/png', 'image/jpeg', 'image/gif']

/**
 * @param {HTMLElement} root
 * @returns {Text[]}
 */
function getTextNodes(root) {
  const queue = [root]
  const result = []
  while (queue.length) {
    const node = queue.shift()
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue !== '\n') {
      result.push(node)
    }
    for (const child of node.childNodes) {
      if (child.tagName !== 'CODE') {
        queue.push(child)
      }
    }
  }
  return result
}

/**
 * @param {string[]} texts
 */
async function translate(texts) {
  if (texts.length === 0) {
    return []
  }
  const idByText = {}
  const dstBySrc = {}
  const srcs = []
  texts.forEach((text) => {
    if (text.trim() === '') {
      dstBySrc[text] = text
      return
    }
    if (text in idByText) {
      return
    }
    idByText[text] = srcs.length
    srcs.push(text)
  })
  const { result: dsts } = await fetch(`/api/1/translate`, {
    method: 'POST',
    body: { text: srcs.join('\n') },
  })
  dsts.forEach((dst, id) => (dstBySrc[srcs[id]] = dst))
  return texts.map((text) => dstBySrc[text])
}

export function BaiduTranslate({ enabled, children }) {
  const { addNotification } = useContext(AppContext)
  const $container = useRef()
  const $texts = useRef()
  const $task = useRef()

  useEffect(() => {
    if (enabled) {
      if (!$texts.current) {
        $texts.current = getTextNodes($container.current).map((node) => ({
          node,
          src: _.trim(node.nodeValue, '\n'),
          dst: '',
        }))
      }
      if (!$task.current) {
        $task.current = translate($texts.current.map((text) => text.src)).then((results) => {
          results.forEach((dst, index) => ($texts.current[index].dst = dst))
          return
        })
      }
      $task.current
        .then(() => {
          $texts.current.forEach(({ node, dst }) => {
            node.replaceData(0, node.length, dst)
          })
          return
        })
        .catch((error) => {
          $task.current = undefined
          addNotification(error)
        })
    } else {
      if ($texts.current) {
        $texts.current.forEach(({ node, src }) => node.replaceData(0, node.length, src))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return <div ref={$container}>{children}</div>
}
BaiduTranslate.propTypes = {
  enabled: PropTypes.bool,
  children: PropTypes.element.isRequired,
}

const MenuIcon = React.forwardRef(({ onClick }, ref) => (
  <Icon.ThreeDots className={`${css.replyMenuIcon} d-block`} ref={ref} onClick={onClick} />
))

function useTruncateReply() {
  const $container = useRef(null)
  const [showCover, setShowCover] = useState(false)
  const $onExpand = useRef()

  useEffect(() => {
    /**
     * @type {HTMLDivElement}
     */
    const container = $container.current
    if (!container || container.clientHeight <= 1000) {
      return
    }

    const onExpand = () => {
      setShowCover(false)
      container.style.maxHeight = null
    }

    // 搜索关键词时会触发滚动，这时自动展开
    const onScroll = () => {
      container.removeEventListener('scroll', onScroll)
      const height = container.clientHeight
      onExpand()
      window.scrollTo({ top: window.scrollY + (container.clientHeight - height) })
    }

    setShowCover(true)
    $onExpand.current = onExpand
    container.style.maxHeight = '380px'
    container.addEventListener('scroll', onScroll)
  }, [])

  return {
    containerRef: $container,
    cover: showCover ? (
      <div className={css.cover} onMouseDown={$onExpand.current}>
        <Button className={css.expand} variant="link" onClick={$onExpand.current}>
          Click to expand
        </Button>
      </div>
    ) : undefined,
  }
}

export function ReplyContent({ children }) {
  if (!children) {
    return (
      <p className="text-muted">
        <em>No description provided.</em>
      </p>
    )
  }
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: children }} />
}
ReplyContent.propTypes = {
  children: PropTypes.string,
}

export function ReplyCard({ data, onDeleted, onEdit, onLoadRevisions }) {
  const { t } = useTranslation()
  const { isCustomerService, currentUser, addNotification } = useContext(AppContext)
  const [imageFiles, otherFiles] = useMemo(() => {
    return _.partition(data.files, (file) => IMAGE_FILE_MIMES.includes(file.mime))
  }, [data.files])
  const [translationEnabled, setTranslationEnabled] = useState(false)

  const actions = useMemo(() => {
    const isReply = data.type === 'reply'
    const tmpActions = {
      translation: isCustomerService,
      revisions: isCustomerService && isReply && data.created_at !== data.updated_at,
      edit: data.is_customer_service && isReply,
      delete: data.is_customer_service && isReply,
    }
    return Object.values(tmpActions).some((v) => v) ? tmpActions : undefined
  }, [isCustomerService, data, currentUser])

  const { mutateAsync: deleteReply, isLoading: deleting } = useMutation({
    mutationFn: () => http.delete(`/api/2/replies/${data.id}`),
    onSuccess: () => onDeleted(data.id),
    onError: (error) => addNotification(error),
  })

  const { containerRef, cover } = useTruncateReply()

  const edited = data.created_at !== data.updated_at

  return (
    <Card
      id={data.id}
      className={classNames({
        [css.staff]: data.is_customer_service,
        [css.internal]: data.internal,
      })}
    >
      <Card.Header className={classNames(css.heading, 'd-flex', 'justify-content-between')}>
        <div>
          <UserLabel user={data.author} /> {t('submittedAt')}{' '}
          <Time value={data.createdAt ?? data.created_at} href={'#' + data.id} />
          {isCustomerService && edited && <span className="ml-2">(edited)</span>}
        </div>
        <div className="d-flex align-items-center">
          {data.is_customer_service && <Badge className={css.badge}>{t('customerService')}</Badge>}
          {data.internal && <InternalBadge className={`${css.badge} ml-1`} />}
          {actions && (
            <Dropdown className="ml-2">
              <Dropdown.Toggle className="d-flex" as={MenuIcon} />
              <Dropdown.Menu align="right">
                {actions.translation && (
                  <Dropdown.Item
                    active={translationEnabled}
                    onClick={() => setTranslationEnabled(!translationEnabled)}
                  >
                    Translate
                  </Dropdown.Item>
                )}
                {actions.revisions && (
                  <Dropdown.Item onClick={() => onLoadRevisions(data.id)}>Revisions</Dropdown.Item>
                )}
                {actions.edit && <Dropdown.Item onClick={() => onEdit(data)}>Edit</Dropdown.Item>}
                {actions.delete && (
                  <Confirm
                    danger
                    header={t('reply.deleteTitle')}
                    content={t('reply.deleteContent')}
                    onConfirm={deleteReply}
                    trigger={
                      <Dropdown.Item className="text-danger" disabled={deleting}>
                        {t('delete')}
                      </Dropdown.Item>
                    }
                  />
                )}
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      </Card.Header>
      <Card.Body ref={containerRef} className={css.content}>
        <BaiduTranslate enabled={translationEnabled}>
          <ReplyContent>
            {DOMPurify.sanitize(data.contentSafeHTML ?? data.content_HTML, {
              FORBID_TAGS: ['style'],
              FORBID_ATTR: ['style'],
            })}
          </ReplyContent>
        </BaiduTranslate>
        {imageFiles.length > 0 && (
          <div>
            <hr />
            {imageFiles.map(({ id, name, url }) => (
              <a key={id} href={url} target="_blank">
                <img src={url} alt={name} />
              </a>
            ))}
          </div>
        )}
        {cover}
      </Card.Body>
      {otherFiles.length > 0 && (
        <Card.Footer>
          {otherFiles.map(({ id, name, url }) => (
            <div key={id}>
              <a href={url} target="_blank">
                <Icon.Paperclip /> {name}
              </a>
            </div>
          ))}
        </Card.Footer>
      )}
    </Card>
  )
}
ReplyCard.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string.isRequired,
    author: PropTypes.object.isRequired,
    is_customer_service: PropTypes.bool,
    content_HTML: PropTypes.string.isRequired,
    files: PropTypes.array.isRequired,
  }),
  onDeleted: PropTypes.func,
  onEdit: PropTypes.func,
  onLoadRevisions: PropTypes.func,
}
