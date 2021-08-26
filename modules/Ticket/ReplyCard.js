import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Card, Dropdown } from 'react-bootstrap'
import * as Icon from 'react-bootstrap-icons'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import xss from 'xss'
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

// get a copy of default whiteList
const whiteList = xss.getDefaultWhiteList()

// allow class attribute for span and code tag
whiteList.span.push('class')
whiteList.code.push('class')

// specified you custom whiteList
const myxss = new xss.FilterXSS({
  whiteList,
  css: false,
})

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

export function ReplyCard({ data, onDeleted, ticketId }) {
  const { t } = useTranslation()
  const { isCustomerService, currentUser, addNotification } = useContext(AppContext)
  const [imageFiles, otherFiles] = useMemo(() => {
    return _.partition(data.files, (file) => IMAGE_FILE_MIMES.includes(file.mime))
  }, [data.files])
  const [translationEnabled, setTranslationEnabled] = useState(false)

  const actions = useMemo(() => {
    const isReplay = data.type === 'reply'
    const isAuthor = currentUser && currentUser.id === data.author.id
    const tmpActions = {
      translation: isCustomerService,
      // edit: false,
      delete: isReplay && isAuthor,
    }
    return Object.values(tmpActions).some((v) => v) ? tmpActions : undefined
  }, [isCustomerService, data, currentUser])
  const { mutateAsync: deleteReply, isLoading: deleting } = useMutation({
    mutationFn: () => http.delete(`/api/1/tickets/${ticketId}/replies/${data.id}`),
    onSuccess: () => onDeleted(data.id),
    onError: (error) => addNotification(error),
  })
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
          <Time value={data.created_at} href={'#' + data.id} />
        </div>
        <div className="d-flex align-items-center">
          {data.is_customer_service &&
            (data.internal ? (
              <InternalBadge className={css.badge} />
            ) : (
              <Badge className={css.badge}>{t('staff')}</Badge>
            ))}
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
                {actions.delete && (
                  <Confirm
                    header={'Are you sure you want to delete this?'}
                    danger
                    onConfirm={deleteReply}
                    content={null}
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
      <Card.Body className={css.content}>
        <BaiduTranslate enabled={translationEnabled}>
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: myxss.process(data.content_HTML) }}
          />
        </BaiduTranslate>
        {imageFiles.length > 0 && (
          <div>
            {imageFiles.map(({ id, name, url }) => (
              <a key={id} href={url} target="_blank">
                <img src={url} alt={name} />
              </a>
            ))}
          </div>
        )}
        {/* {isCustomerService && getFlag('Translation') && <TranslateContent text={data.content} />} */}
      </Card.Body>
      {otherFiles.length > 0 && (
        <Card.Footer>
          {otherFiles.map(({ id, name, url }) => (
            <div key={id}>
              <a href={url + '?attname=' + encodeURIComponent(name)} target="_blank">
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
  ticketId: PropTypes.string.isRequired,
}
