import React, { Component, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useHistory, useRouteMatch } from 'react-router-dom'
import moment from 'moment'
import _ from 'lodash'
import xss from 'xss'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'
import css from './index.css'
import { auth, cloud, db, fetch } from '../../lib/leancloud'
import { uploadFiles } from '../common'
import csCss from '../CustomerServiceTickets.css'
import { ticketStatus } from '../../lib/common'
import TicketReply from './TicketReply'
import Evaluation from './Evaluation'
import TicketMetadata from './TicketMetadata'
import { TicketStatusLabel } from '../components/TicketStatusLabel'
import Tag from './Tag'
import { WeekendWarning } from '../components/WeekendWarning'
import { UserLabel } from '../UserLabel'
import { DocumentTitle } from '../utils/DocumentTitle'
import { TicketOperation } from './TicketOperation'
import { OpsLog, Time } from './OpsLog'
import { AppContext } from '../context'
import { useOpsLogs, useReplies, useTicket } from './hooks'

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

class Ticket extends Component {
  constructor(props) {
    super(props)
    this.state = {
      ticket: null,
      replies: [],
      opsLogs: [],
      watch: null,
    }
  }

  componentDidMount() {
    const { nid } = this.props.match.params
    this.getTicketQuery(parseInt(nid))
      .first()
      .then((ticket) => {
        return Promise.all([
          this.getReplyQuery(ticket).find(),
          this.getOpsLogQuery(ticket).find(),
          db
            .class('Watch')
            .where('ticket', '==', ticket)
            .where('user', '==', auth.currentUser)
            .first(),
        ]).then(([replies, opsLogs, watch]) => {
          this.setState({
            ticket,
            replies,
            opsLogs,
            watch,
          })
          cloud.run('exploreTicket', { ticketId: ticket.id })
          return
        })
      })
      .catch(this.context.addNotification)
  }

  componentWillUnmount() {
    if (this.replyLiveQuery) {
      Promise.all([
        this.ticketLiveQuery.unsubscribe(),
        this.replyLiveQuery.unsubscribe(),
        this.opsLogLiveQuery.unsubscribe(),
      ]).catch(this.context.addNotification)
    }
  }

  getTicketQuery(nid) {
    const query = db
      .class('Ticket')
      .where('nid', '==', nid)
      .include('author')
      .include('organization')
      .include('assignee')
      .include('files')
      .limit(1)
    query
      .subscribe()
      .then((liveQuery) => {
        this.ticketLiveQuery = liveQuery
        return this.ticketLiveQuery.on('update', (ticket) => {
          if (ticket.updatedAt.getTime() != this.state.ticket.updatedAt.getTime()) {
            return Promise.all([
              ticket.get({ include: ['author', 'organization', 'assignee', 'files'] }),
              cloud.run('getPrivateTags', { ticketId: ticket.id }),
            ])
              .then(([ticket, privateTags]) => {
                if (privateTags) {
                  ticket.data.privateTags = privateTags.privateTags
                }
                this.setState({ ticket })
                cloud.run('exploreTicket', { ticketId: ticket.id })
                return
              })
              .catch(this.context.addNotification)
          }
        })
      })
      .catch(this.context.addNotification)
    return query
  }

  getReplyQuery(ticket) {
    const replyQuery = db
      .class('Reply')
      .where('ticket', '==', ticket)
      .include('author')
      .include('files')
      .orderBy('createdAt')
      .limit(500)
    replyQuery
      .subscribe()
      .then((liveQuery) => {
        this.replyLiveQuery = liveQuery
        return this.replyLiveQuery.on('create', (reply) => {
          return this.appendReply(reply).catch(this.context.addNotification)
        })
      })
      .catch(this.context.addNotification)
    return replyQuery
  }

  getOpsLogQuery(ticket) {
    const opsLogQuery = db.class('OpsLog').where('ticket', '==', ticket).orderBy('createdAt')
    opsLogQuery
      .subscribe()
      .then((liveQuery) => {
        this.opsLogLiveQuery = liveQuery
        return this.opsLogLiveQuery.on('create', (opsLog) => {
          return opsLog
            .get()
            .then((opsLog) => {
              const opsLogs = this.state.opsLogs
              opsLogs.push(opsLog)
              this.setState({ opsLogs })
              return
            })
            .catch(this.context.addNotification)
        })
      })
      .catch(this.context.addNotification)
    return opsLogQuery
  }

  async appendReply(reply) {
    reply = await reply.get({ include: ['author', 'files'] })
    this.setState(({ replies }) => {
      return {
        replies: _.uniqBy([...replies, reply], (r) => r.id),
      }
    })
  }

  async commitReply(content, files) {
    content = content.trim()
    if (content === '' && files.length === 0) {
      return
    }
    try {
      const reply = await db.class('Reply').add({
        content,
        ticket: this.state.ticket,
        files: await uploadFiles(files),
      })
      await this.appendReply(reply)
    } catch (error) {
      this.context.addNotification(error)
    }
  }

  commitReplySoon() {
    return this.operateTicket('replySoon')
  }

  updateTicketCategory(category) {
    const ticket = this.state.ticket
    return updateTicket(ticket.id, { categoryId: category.id }).then(() => {
      ticket.data.category = category
      this.setState({ ticket })
      return
    })
  }

  updateTicketAssignee(assignee) {
    const ticket = this.state.ticket
    return updateTicket(ticket.id, { assigneeId: assignee.id })
      .then(() => {
        ticket.data.assignee = assignee
        return
      })
      .catch(this.context.addNotification)
  }

  saveEvaluation(evaluation) {
    const ticket = this.state.ticket
    ticket.data.evaluation = evaluation
    return ticket.update({ evaluation }).then(() => {
      this.setState({ ticket })
      return
    })
  }

  render() {
    const { t } = this.props
    const ticket = this.state.ticket
    if (!ticket) {
      return t('loading') + '...'
    }

    // 如果是客服自己提交工单，则当前客服在该工单中认为是用户，
    // 这是为了方便工单作为内部工作协调使用。
    const isCustomerService =
      this.props.isCustomerService && ticket.author.objectId !== this.props.currentUser.id
    const timeline = _.chain(this.state.replies)
      .concat(this.state.opsLogs)
      .sortBy((data) => data.createdAt)
      .map(this.ticketTimeline.bind(this))
      .value()

    return (
      <>
        <DocumentTitle title={ticket.title + ' - LeanTicket' || 'LeanTicket'} />
        <Row className="mt-3">
          <Col sm={12}>
            {!isCustomerService && <WeekendWarning />}
            <h1>{ticket.title}</h1>
            <div className={css.meta}>
              <span className={csCss.nid}>#{ticket.nid}</span>
              <TicketStatusLabel status={ticket.status} />{' '}
              <span>
                <UserLabel user={ticket.author} displayTags={isCustomerService} /> {t('createdAt')}{' '}
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
              {this.props.isCustomerService ? (
                this.state.watch ? (
                  <OverlayTrigger
                    placement="right"
                    overlay={<Tooltip id="tooltip">{t('clickToUnsubscribe')}</Tooltip>}
                  >
                    <Button variant="link" active onClick={this.handleRemoveWatch.bind(this)}>
                      <Icon.EyeSlash />
                    </Button>
                  </OverlayTrigger>
                ) : (
                  <OverlayTrigger
                    placement="right"
                    overlay={<Tooltip id="tooltip">{t('clickToSubscribe')}</Tooltip>}
                  >
                    <Button variant="link" onClick={this.handleAddWatch.bind(this)}>
                      <Icon.Eye />
                    </Button>
                  </OverlayTrigger>
                )
              ) : (
                <div></div>
              )}
            </div>
            <hr />
          </Col>
        </Row>

        <Row className="row">
          <Col sm={8}>
            <div className="tickets">
              {React.createElement(ReplyCard, ticket)}
              <div>{timeline}</div>
            </div>

            <div>
              <hr />
              {ticketStatus.isOpened(ticket.data.status) ? (
                <TicketReply
                  ticket={ticket}
                  commitReply={this.commitReply.bind(this)}
                  commitReplySoon={this.commitReplySoon.bind(this)}
                  operateTicket={this.operateTicket.bind(this)}
                  isCustomerService={isCustomerService}
                />
              ) : (
                <Evaluation
                  saveEvaluation={this.saveEvaluation.bind(this)}
                  ticket={ticket}
                  isCustomerService={isCustomerService}
                />
              )}
            </div>
          </Col>

          <Col className={css.sidebar} sm={4}>
            {this.state.tags.map((tag) => (
              <Tag key={tag.id} tag={tag} ticket={ticket} isCustomerService={isCustomerService} />
            ))}

            <TicketMetadata
              ticket={ticket}
              isCustomerService={isCustomerService}
              categoriesTree={this.state.categoriesTree}
              updateTicketAssignee={this.updateTicketAssignee.bind(this)}
              updateTicketCategory={this.updateTicketCategory.bind(this)}
              saveTag={this.saveTag.bind(this)}
            />

            <TicketOperation
              isCustomerService={isCustomerService}
              ticket={ticket.toJSON()}
              onOperate={this.operateTicket.bind(this)}
            />
          </Col>
        </Row>
      </>
    )
  }
}

Ticket.propTypes = {
  history: PropTypes.object.isRequired,
  match: PropTypes.object.isRequired,
  currentUser: PropTypes.object,
  isCustomerService: PropTypes.bool,
  t: PropTypes.func.isRequired,
}

Ticket.contextTypes = {
  addNotification: PropTypes.func.isRequired,
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

/**
 * @param {number} nid
 */
function useTicket__(nid) {
  const { addNotification } = useContext(AppContext)
  const [ticket, setTicket] = useState()
  const [subscribed, setSubscribed] = useState(false)
  const [error, setError] = useState()

  const reload = useCallback(async () => {
    setError(undefined)
    try {
      const { ticket, subscribed } = await fetch(`/api/1/tickets/${nid}`)
      setTicket(ticket)
      setSubscribed(subscribed)
    } catch (error) {
      setError(error)
    }
  }, [nid])

  useEffect(() => {
    reload()
    let subscription
    const query = db.class('Ticket').where('nid', '==', nid)
    query
      .subscribe()
      .then((s) => {
        subscription = s
        s.on('update', reload)
        return
      })
      .catch(addNotification)
    return () => {
      subscription?.unsubscribe()
    }
  }, [nid, addNotification])

  const subscribe = useCallback(async () => {
    try {
      await fetch(`/api/1/tickets/${nid}/subscription`, {
        method: 'POST',
      })
      setSubscribed(true)
    } catch (error) {
      addNotification(error)
    }
  }, [nid, addNotification])

  const unsubscribe = useCallback(async () => {
    try {
      await fetch(`/api/1/tickets/${nid}/subscription`, {
        method: 'DELETE',
      })
      setSubscribed(false)
    } catch (error) {
      addNotification(error)
    }
  }, [nid, addNotification])

  const updateTicket = useCallback(
    async (data) => {
      try {
        await fetch(`/api/1/tickets/${nid}`, { method: 'PATCH', body: data })
      } catch (error) {
        addNotification(error)
      }
    },
    [nid, addNotification]
  )

  const updateAssignee = useCallback(
    async (assignee) => {
      await updateTicket({ assigneeId: assignee.id })
      setTicket((current) => ({ ...current, assignee: assignee.toJSON() }))
    },
    [updateTicket]
  )

  const updateCategory = useCallback(
    async (category) => {
      await updateTicket({ categoryId: category.id })
      setTicket((current) => ({ ...current, category: category.toJSON() }))
    },
    [updateTicket]
  )

  const saveTag = async (key, value, isPrivate) => {
    const tags = [...ticket[isPrivate ? 'privateTags' : 'tags']]
    const index = tags.findIndex((tag) => tag.key === key)
    if (index === -1) {
      if (!value) {
        return
      }
      tags.push({ key, value })
    } else {
      if (value) {
        tags[index] = { ...tags[index], value }
      } else {
        tags.splice(index, 1)
      }
    }
    try {
      await fetch(`/api/1/tickets/${nid}/tags`, {
        method: 'PUT',
        body: { tags, isPrivate },
      })
      setTicket((current) => ({ ...current, [isPrivate ? 'privateTags' : 'tags']: tags }))
    } catch (error) {
      addNotification(error)
    }
  }

  const evaluate = useCallback(
    async (evaluation) => {
      try {
        await fetch(`/api/1/tickets/${nid}/evaluation`, {
          method: 'PUT',
          body: { evaluation },
        })
      } catch (error) {
        addNotification(error)
      }
    },
    [nid, addNotification]
  )

  const operate = useCallback(
    async (action) => {
      try {
        await fetch(`/api/1/tickets/${nid}/operate`, {
          method: 'POST',
          body: { action },
        })
      } catch (error) {
        addNotification(error)
      }
    },
    [nid]
  )

  return {
    ticket,
    subscribed,
    error,
    subscribe,
    unsubscribe,
    updateAssignee,
    updateCategory,
    saveTag,
    evaluate,
    operate,
  }
}

export default function _Ticket({ isCustomerService, currentUser }) {
  const { t } = useTranslation()
  const { params } = useRouteMatch()
  const history = useHistory()
  const nid = parseInt(params.nid)
  const { addNotification } = useContext(AppContext)
  const { data, isError, isLoading } = useTicket(nid)
  const ticket = data?.ticket
  const subscribed = data?.subscribed
  const { data: repliesData } = useReplies(nid)
  const { data: opsLogsData } = useOpsLogs(nid)

  useEffect(() => {
    if (isError) {
      history.replace({
        pathname: '/error',
        state: { code: 'Unauthorized' },
      })
    }
  }, [isError])

  const isCS = useMemo(() => {
    if (!ticket) {
      return isCustomerService
    }
    return isCustomerService && ticket.author.objectId !== currentUser.id
  }, [isCustomerService, currentUser, ticket])

  const replies = useMemo(() => {
    return repliesData?.pages.map((page) => page.replies).flat() || []
  }, [repliesData])

  const opsLogs = useMemo(() => {
    return opsLogsData?.pages.map((page) => page.opsLogs).flat() || []
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
  }, [ticketId])

  if (isLoading) {
    return t('loading') + '...'
  }
  return (
    <>
      <DocumentTitle title={ticket.title + ' - LeanTicket' || 'LeanTicket'} />
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
                  <Button variant="link" active onClick={() => console.log('unsubscribe')}>
                    <Icon.EyeSlash />
                  </Button>
                </OverlayTrigger>
              ) : (
                <OverlayTrigger
                  placement="right"
                  overlay={<Tooltip id="tooltip">{t('clickToSubscribe')}</Tooltip>}
                >
                  <Button variant="link" onClick={() => console.log('subscribe')}>
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
              <TicketReply ticket={ticket} isCustomerService={isCustomerService} />
            ) : (
              <Evaluation
                ticket={ticket}
                isCustomerService={isCustomerService}
                saveEvaluation={console.log}
              />
            )}
          </div>
        </Col>

        <Col className={css.sidebar} sm={4}>
          {tags.map((tag) => (
            <Tag
              key={tag.objectId}
              tag={tag}
              ticket={ticket}
              isCustomerService={isCustomerService}
            />
          ))}

          <TicketMetadata ticket={ticket} isCustomerService={isCustomerService} />

          {/* <TicketOperation
            ticket={ticket}
            isCustomerService={isCustomerService}
            onOperate={console.log}
          /> */}
        </Col>
      </Row>
    </>
  )
}
