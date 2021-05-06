import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useHistory, useRouteMatch } from 'react-router-dom'
import moment from 'moment'
import _ from 'lodash'
import xss from 'xss'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'
import css from './index.css'
import { db, fetch } from '../../lib/leancloud'
import csCss from '../CustomerServiceTickets.css'
import { ticketStatus } from '../../lib/common'
import TicketReply from './TicketReply'
import Evaluation from './Evaluation'
import TicketMetadata from './TicketMetadata'
import { TicketStatusLabel } from '../components/TicketStatusLabel'
import Tag from './Tag'
import { WeekendWarning } from '../components/WeekendWarning'
import { UserLabel } from '../UserLabel'
import { TicketOperation } from './TicketOperation'
import { OpsLog, Time } from './OpsLog'
import { AppContext } from '../context'
import { fetchTicket, useOpsLogs, useReplies } from './hooks'
import { useQuery, useQueryClient } from 'react-query'
import { useTitle } from '../utils/hooks'

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

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif']

function ReplyCard({ reply }) {
  const { t } = useTranslation()
  const { objectId, author, content_HTML, createdAt, files, isCustomerService } = reply
  const imageFiles = []
  const otherFiles = []
  files?.forEach((file) => {
    if (IMAGE_MIMES.includes(file.mime_type)) {
      imageFiles.push(file)
    } else {
      otherFiles.push(file)
    }
  })

  return (
    <Card
      id={objectId}
      key={objectId}
      className={isCustomerService ? css.panelModerator : undefined}
    >
      <Card.Header className={css.heading}>
        <UserLabel user={author} /> {t('submittedAt')} <Time value={createdAt} hash={objectId} />
        {isCustomerService && <i className={css.badge}>{t('staff')}</i>}
      </Card.Header>
      <Card.Body className={css.content}>
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: myxss.process(content_HTML) }}
        />
        {imageFiles.map(({ objectId, name, url }) => (
          <a key={objectId} href={url} target="_blank">
            <img src={url} alt={name} />
          </a>
        ))}
      </Card.Body>
      {otherFiles.length > 0 && (
        <Card.Footer>
          {otherFiles.map(({ objectId, name, url }) => (
            <div key={objectId}>
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
  reply: PropTypes.shape({
    objectId: PropTypes.string.isRequired,
    author: PropTypes.object.isRequired,
    content_HTML: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    files: PropTypes.array,
    isCustomerService: PropTypes.bool,
  }),
}

function Timeline({ data }) {
  switch (data.type) {
    case 'reply':
      return <ReplyCard reply={data} />
    case 'opsLog':
      return <OpsLog opsLog={data} />
    default:
      return null
  }
}
Timeline.propTypes = {
  data: PropTypes.shape({
    type: PropTypes.oneOf(['reply', 'opsLog']),
  }),
}

export default function Ticket({ isCustomerService, currentUser }) {
  const { t } = useTranslation()
  const { params } = useRouteMatch()
  const history = useHistory()
  const nid = parseInt(params.nid)
  const { addNotification } = useContext(AppContext)
  const { data, isError, isLoading, refetch } = useQuery(['ticket', nid], () => fetchTicket(nid))
  const ticket = data?.ticket
  const subscribed = data?.subscribed
  const { data: repliesData, fetchNextPage: fetchMoreReplies } = useReplies(nid)
  const { data: opsLogsData, fetchNextPage: fetchMoreOpsLogs } = useOpsLogs(nid)
  const queryClient = useQueryClient()
  useTitle(ticket?.title ? ticket.title + ' - LeanTicket' : 'LeanTicket')

  useEffect(() => {
    if (isError) {
      history.replace({
        pathname: '/error',
        state: { code: 'Unauthorized' },
      })
    }
  }, [isError, history])

  const isCS = useMemo(() => {
    return isCustomerService && ticket?.author.objectId !== currentUser.id
  }, [isCustomerService, currentUser, ticket?.author.objectId])

  const replies = useMemo(() => {
    return _.uniqBy(repliesData?.pages.map((page) => page.replies).flat(), 'objectId')
  }, [repliesData])

  const opsLogs = useMemo(() => {
    return _.uniqBy(opsLogsData?.pages.map((page) => page.opsLogs).flat(), 'objectId')
  }, [opsLogsData])

  const timeline = useMemo(() => {
    return [
      ...replies.map((data) => ({ ...data, type: 'reply' })),
      ...opsLogs.map((data) => ({ ...data, type: 'opsLog' })),
    ].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
  }, [replies, opsLogs])

  const [tags, setTags] = useState([])
  const ticketId = ticket?.objectId
  useEffect(() => {
    if (ticketId) {
      db.class('Tag')
        .where('ticket', '==', db.class('Ticket').object(ticketId))
        .find()
        .then((tags) => setTags(tags.map((tag) => tag.toJSON())))
        .catch(addNotification)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  useEffect(() => {
    if (!ticketId) {
      return
    }
    const query = db.class('Ticket').where('objectId', '==', ticketId)
    let subscription = null
    query
      .subscribe()
      .then((subs) => {
        subscription = subs
        subs.on('update', () => refetch())
        return
      })
      .catch(addNotification)
    return () => {
      subscription?.unsubscribe()
    }
  }, [ticketId, refetch, addNotification])
  useEffect(() => {
    if (!ticketId) {
      return
    }
    const query = db.class('Reply').where('ticket', '==', db.class('Ticket').object(ticketId))
    let subscription = null
    query
      .subscribe()
      .then((subs) => {
        subscription = subs
        subs.on('create', () => fetchMoreReplies())
        return
      })
      .catch(addNotification)
    return () => {
      subscription?.unsubscribe()
    }
  }, [ticketId, fetchMoreReplies, addNotification])
  useEffect(() => {
    if (!ticketId) {
      return
    }
    const query = db.class('OpsLog').where('ticket', '==', db.class('Ticket').object(ticketId))
    let subscription = null
    query
      .subscribe()
      .then((subs) => {
        subscription = subs
        subs.on('create', () => fetchMoreOpsLogs())
        return
      })
      .catch(addNotification)
    return () => {
      subscription?.unsubscribe()
    }
  }, [ticketId, fetchMoreOpsLogs, addNotification])

  const handleSubscribe = async (subscribed) => {
    try {
      await fetch(`/api/1/tickets/${nid}/subscription`, {
        method: subscribed ? 'POST' : 'DELETE',
      })
      queryClient.setQueryData(['ticket', nid], (current) => ({ ...current, subscribed }))
    } catch (error) {
      addNotification(error)
    }
  }

  if (isLoading) {
    return t('loading') + '...'
  }
  return (
    <>
      <Row className="mt-3">
        <Col sm={12}>
          {!isCS && <WeekendWarning />}
          <h1>{ticket.title}</h1>
          <div className={css.meta}>
            <span className={csCss.nid}>#{ticket.nid}</span>
            <TicketStatusLabel status={ticket.status} />{' '}
            <span>
              <UserLabel user={ticket.author} displayTags={isCS} /> {t('createdAt')}{' '}
              <span title={moment(ticket.createdAt).format()}>
                {moment(ticket.createdAt).fromNow()}
              </span>
              {moment(ticket.createdAt).fromNow() !== moment(ticket.updatedAt).fromNow() && (
                <span>
                  , {t('updatedAt')}{' '}
                  <span title={moment(ticket.updatedAt).format()}>
                    {moment(ticket.updatedAt).fromNow()}
                  </span>
                </span>
              )}
            </span>{' '}
            {isCS &&
              (subscribed ? (
                <OverlayTrigger
                  placement="right"
                  overlay={<Tooltip id="tooltip">{t('clickToUnsubscribe')}</Tooltip>}
                >
                  <Button variant="link" onClick={() => handleSubscribe(false)}>
                    <Icon.EyeSlash />
                  </Button>
                </OverlayTrigger>
              ) : (
                <OverlayTrigger
                  placement="right"
                  overlay={<Tooltip id="tooltip">{t('clickToSubscribe')}</Tooltip>}
                >
                  <Button variant="link" onClick={() => handleSubscribe(true)}>
                    <Icon.Eye />
                  </Button>
                </OverlayTrigger>
              ))}
          </div>
          <hr />
        </Col>
      </Row>

      <Row className="row">
        <Col sm={8}>
          <div className="tickets">
            <ReplyCard reply={ticket} />
            <div>
              {timeline.map((data) => (
                <Timeline key={data.objectId} data={data} />
              ))}
            </div>
          </div>

          <div>
            <hr />
            {ticketStatus.isOpened(ticket.status) ? (
              <TicketReply ticket={ticket} isCustomerService={isCS} />
            ) : (
              <Evaluation ticket={ticket} isCustomerService={isCS} />
            )}
          </div>
        </Col>

        <Col className={css.sidebar} sm={4}>
          {tags.map((tag) => (
            <Tag key={tag.objectId} tag={tag} ticket={ticket} isCustomerService={isCS} />
          ))}

          <TicketMetadata ticket={ticket} isCustomerService={isCS} />

          <TicketOperation ticket={ticket} isCustomerService={isCS} />
        </Col>
      </Row>
    </>
  )
}

Ticket.propTypes = {
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  currentUser: PropTypes.object,
  isCustomerService: PropTypes.bool,
  t: PropTypes.func.isRequired,
}
