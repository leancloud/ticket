import React, { Component } from 'react'
import { Button, Card, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import { useTranslation, withTranslation } from 'react-i18next'
import { withRouter } from 'react-router-dom'
import moment from 'moment'
import _ from 'lodash'
import xss from 'xss'
import PropTypes from 'prop-types'
import * as Icon from 'react-bootstrap-icons'
import css from './index.css'
import { cloud, db, fetch } from '../../lib/leancloud'
import { uploadFiles, getCategoryPathName, getCategoriesTree } from '../common'
import csCss from '../CustomerServiceTickets.css'
import { ticketStatus } from '../../lib/common'
import Evaluation from '../Evaluation'
import TicketMetadata from './TicketMetadata'
import TicketReply from './TicketReply'
import { TicketStatusLabel } from '../components/TicketStatusLabel'
import Tag from '../Tag'
import { WeekendWarning } from '../components/WeekendWarning'
import { UserLabel } from '../UserLabel'
import { DocumentTitle } from '../utils/DocumentTitle'
import { TicketOperation } from './TicketOperation'

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

function UserOrSystem({ operator }) {
  const { t } = useTranslation(0)
  if (!operator || operator.id === 'system') {
    return t('system')
  }
  return <UserLabel user={operator} />
}
UserOrSystem.propTypes = {
  operator: PropTypes.object,
}

class Ticket extends Component {
  constructor(props) {
    super(props)
    this.state = {
      categoriesTree: [],
      ticket: null,
      replies: [],
      opsLogs: [],
      watch: null,
      tags: [],
    }
  }

  async componentDidMount() {
    const { nid } = this.props.match.params
    const tickets = await fetch(`/api/1/tickets`, { query: { q: 'nid:' + nid } })
    if (tickets.length === 0) {
      this.props.history.replace({
        pathname: '/error',
        state: { code: 'Unauthorized' },
      })
      return
    }
    const ticket = await this.fetchTicket(tickets[0].id)
    const [tags, categoriesTree, replies, opsLogs] = await Promise.all([
      db.class('Tag').where('ticket', '==', db.class('Ticket').object(ticket.id)).find(),
      getCategoriesTree(false),
      this.fetchReplies(ticket.id),
      this.fetchOpsLogs(ticket.id),
    ])
    this.setState({ ticket, watch: ticket.subscribed, tags, categoriesTree, replies, opsLogs })
    this.subscribeReply(ticket.id)
    this.subscribeOpsLog(ticket.id)
    this.subscribeTicket(ticket.id)
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

  async fetchTicket(ticketId) {
    return fetch(`/api/1/tickets/${ticketId}`)
  }

  async subscribeTicket(ticketId) {
    const query = db.class('Ticket').where('objectId', '==', ticketId)
    const subscription = await query.subscribe()
    this.ticketLiveQuery = subscription
    subscription.on('update', async () => {
      const ticket = await this.fetchTicket(ticketId)
      this.setState({ ticket })
    })
  }

  async fetchReplies(ticketId, after) {
    const replies = await fetch(`/api/1/tickets/${ticketId}/replies`, {
      query: {
        q: after ? `created_at:>${after}` : undefined,
      },
    })
    return replies
  }

  async subscribeReply(ticketId) {
    const query = db.class('Reply').where('ticket', '==', db.class('Ticket').object(ticketId))
    const subscription = await query.subscribe()
    this.replyLiveQuery = subscription
    subscription.on('create', async () => {
      const replies = await this.fetchReplies(ticketId, _.last(this.state.replies)?.created_at)
      this.setState((state) => ({
        replies: _.uniqBy(state.replies.concat(replies), 'id'),
      }))
    })
  }

  async fetchOpsLogs(ticketId, after) {
    const opsLogs = await fetch(`/api/1/tickets/${ticketId}/ops-logs`, {
      query: { after },
    })
    const userIds = new Set()
    const categoryIds = new Set()
    opsLogs.forEach((opsLog) => {
      if (opsLog.assignee_id) {
        userIds.add(opsLog.assignee_id)
      }
      if (opsLog.operator_id && opsLog.operator_id !== 'system') {
        userIds.add(opsLog.operator_id)
      }
      if (opsLog.category_id) {
        categoryIds.add(opsLog.category_id)
      }
    })
    const [users, categories] = await Promise.all([
      userIds.size
        ? fetch(`/api/1/users`, { query: { q: `id:${Array.from(userIds).join(',')}` } })
        : [],
      categoryIds.size
        ? fetch(`/api/1/categories`, { query: { q: `id:${Array.from(categoryIds).join(',')}` } })
        : [],
    ])
    opsLogs.forEach((opsLog) => {
      opsLog.type = 'opsLog'
      if (opsLog.assignee_id) {
        opsLog.assignee = users.find((user) => user.id === opsLog.assignee_id)
      }
      if (opsLog.operator_id && opsLog.operator_id !== 'system') {
        opsLog.operator = users.find((user) => user.id === opsLog.operator_id)
      }
      if (opsLog.category_id) {
        opsLog.category = categories.find((category) => category.id === opsLog.category_id)
      }
    })
    return opsLogs
  }

  async subscribeOpsLog(ticketId) {
    const query = db.class('OpsLog').where('ticket', '==', db.class('Ticket').object(ticketId))
    const subscription = await query.subscribe()
    this.opsLogLiveQuery = subscription
    subscription.on('create', async () => {
      const opsLogs = await this.fetchOpsLogs(ticketId, _.last(this.state.opsLogs)?.created_at)
      this.setState((state) => ({
        opsLogs: _.uniqBy(state.opsLogs.concat(opsLogs), 'id'),
      }))
    })
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
      const uploadedFiles = await uploadFiles(files)
      await fetch(`/api/1/tickets/${this.state.ticket.id}/replies`, {
        method: 'POST',
        body: {
          content,
          file_ids: uploadedFiles.map((file) => file.id),
        },
      })
    } catch (error) {
      this.context.addNotification(error)
    }
  }

  commitReplySoon() {
    return this.operateTicket('replySoon')
  }

  async operateTicket(action) {
    const ticket = this.state.ticket
    try {
      await fetch(`/api/1/tickets/${ticket.id}/operate`, {
        method: 'POST',
        body: { action },
      })
    } catch (error) {
      this.context.addNotification(error)
    }
  }

  updateTicketCategory(category) {
    const ticket = this.state.ticket
    return fetch(`/api/1/tickets/${ticket.id}`, {
      method: 'PATCH',
      body: { category_id: category.id },
    })
  }

  updateTicketAssignee(assignee) {
    const ticket = this.state.ticket
    return fetch(`/api/1/tickets/${ticket.id}`, {
      method: 'PATCH',
      body: { assignee_id: assignee.id },
    })
  }

  async saveTag(key, value, isPrivate) {
    const ticket = this.state.ticket
    let tags = ticket[isPrivate ? 'private_tags' : 'tags']
    if (!tags) {
      tags = []
    }
    const tag = _.find(tags, { key })
    if (!tag) {
      if (value == '') {
        return
      }
      tags.push({ key, value })
    } else {
      if (value == '') {
        tags = _.reject(tags, { key })
      } else {
        tag.value = value
      }
    }
    try {
      await fetch(`/api/1/tickets/${ticket.id}`, {
        method: 'PATCH',
        body: {
          [isPrivate ? 'private_tags' : 'tags']: tags,
        },
      })
    } catch (error) {
      this.context.addNotification(error)
    }
  }

  saveEvaluation(evaluation) {
    const ticket = this.state.ticket
    return fetch(`/api/1/tickets/${ticket.id}`, {
      method: 'PATCH',
      body: { evaluation },
    })
  }

  async handleAddWatch() {
    try {
      await fetch(`/api/1/tickets/${this.state.ticket.id}`, {
        method: 'PATCH',
        body: { subscribed: true },
      })
      this.setState({ watch: true })
    } catch (error) {
      this.context.addNotification(error)
    }
  }

  async handleRemoveWatch() {
    try {
      await fetch(`/api/1/tickets/${this.state.ticket.id}`, {
        method: 'PATCH',
        body: { subscribed: false },
      })
      this.setState({ watch: false })
    } catch (error) {
      this.context.addNotification(error)
    }
  }

  contentView(content) {
    return <div dangerouslySetInnerHTML={{ __html: myxss.process(content) }} />
  }

  getTime(avObj) {
    if (moment().diff(avObj.created_at) > 86400000) {
      return (
        <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.created_at).format()}>
          {moment(avObj.created_at).calendar()}
        </a>
      )
    } else {
      return (
        <a href={'#' + avObj.id} className="timestamp" title={moment(avObj.created_at).format()}>
          {moment(avObj.created_at).fromNow()}
        </a>
      )
    }
  }

  ticketTimeline(avObj) {
    const { t } = this.props
    if (avObj.type === 'opsLog') {
      switch (avObj.action) {
        case 'selectAssignee':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap">
                  <Icon.ArrowLeftRight />
                </span>
              </div>
              <div className="ticket-status-right">
                {t('system')} {t('assignedTicketTo')} <UserLabel user={avObj.assignee} /> (
                {this.getTime(avObj)})
              </div>
            </div>
          )
        case 'changeCategory':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap">
                  <Icon.ArrowLeftRight />
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.operator} /> {t('changedTicketCategoryTo')}{' '}
                <span className={csCss.category + ' ' + css.category}>
                  {getCategoryPathName(avObj.category, this.state.categoriesTree)}
                </span>{' '}
                ({this.getTime(avObj)})
              </div>
            </div>
          )
        case 'changeAssignee':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap">
                  <Icon.ArrowLeftRight />
                </span>
              </div>
              <div className="ticket-status-right">
                <UserOrSystem operator={avObj.operator} /> {t('changedTicketAssigneeTo')}{' '}
                <UserLabel user={avObj.assignee} /> ({this.getTime(avObj)})
              </div>
            </div>
          )
        case 'replyWithNoContent':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap">
                  <Icon.ChatLeftFill />
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.operator} /> {t('thoughtNoNeedToReply')} (
                {this.getTime(avObj)})
              </div>
            </div>
          )
        case 'replySoon':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap awaiting">
                  <Icon.Hourglass />
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.operator} /> {t('thoughtNeedTime')} ({this.getTime(avObj)})
              </div>
            </div>
          )
        case 'resolve':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap resolved">
                  <Icon.CheckCircle />
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.operator} /> {t('thoughtResolved')} ({this.getTime(avObj)})
              </div>
            </div>
          )
        case 'close':
        case 'reject': // 向前兼容
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap closed">
                  <Icon.SlashCircle />
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.operator} /> {t('closedTicket')} ({this.getTime(avObj)})
              </div>
            </div>
          )
        case 'reopen':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap reopened">
                  <Icon.RecordCircle />
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.operator} /> {t('reopenedTicket')} ({this.getTime(avObj)})
              </div>
            </div>
          )
      }
    } else {
      let panelFooter = null
      let imgBody = <div></div>
      const files = avObj.files
      if (files && files.length !== 0) {
        const imgFiles = []
        const otherFiles = []
        files.forEach((f) => {
          if (['image/png', 'image/jpeg', 'image/gif'].indexOf(f.mime) != -1) {
            imgFiles.push(f)
          } else {
            otherFiles.push(f)
          }
        })

        if (imgFiles.length > 0) {
          imgBody = imgFiles.map((f) => {
            return (
              <a href={f.url} target="_blank" key={f.id}>
                <img src={f.url} alt={f.name} />
              </a>
            )
          })
        }

        if (otherFiles.length > 0) {
          const fileLinks = otherFiles.map((f) => {
            return (
              <span key={f.id}>
                <a href={f.url + '?attname=' + encodeURIComponent(f.name)} target="_blank">
                  <Icon.Paperclip /> {f.name}
                </a>{' '}
              </span>
            )
          })
          panelFooter = <Card.Footer className={css.footer}>{fileLinks}</Card.Footer>
        }
      }
      const userLabel = avObj.is_customer_service ? (
        <span>
          <UserLabel user={avObj.author} />
          <i className={css.badge}>{t('staff')}</i>
        </span>
      ) : (
        <UserLabel user={avObj.author} />
      )
      return (
        <Card
          id={avObj.id}
          key={avObj.id}
          className={avObj.is_customer_service ? css.panelModerator : undefined}
        >
          <Card.Header className={css.heading}>
            {userLabel} {t('submittedAt')} {this.getTime(avObj)}
          </Card.Header>
          <Card.Body className={`${css.content} markdown-body`}>
            {this.contentView(avObj.content_HTML)}
            {imgBody}
          </Card.Body>
          {panelFooter}
        </Card>
      )
    }
  }

  render() {
    const { t } = this.props
    const ticket = this.state.ticket
    if (ticket === null) {
      return <div>{t('loading')}……</div>
    }

    // 如果是客服自己提交工单，则当前客服在该工单中认为是用户，
    // 这是为了方便工单作为内部工作协调使用。
    const isCustomerService =
      this.props.isCustomerService && ticket.author_id !== this.props.currentUser.id
    const timeline = _.chain(this.state.replies)
      .concat(this.state.opsLogs)
      .sortBy((data) => data.created_at)
      .map(this.ticketTimeline.bind(this))
      .value()

    return (
      <>
        <DocumentTitle title={ticket.title + ' - LeanTicket'} />
        <Row className="mt-3">
          <Col sm={12}>
            {!isCustomerService && <WeekendWarning />}
            <h1>{ticket.title}</h1>
            <div className={css.meta}>
              <span className={csCss.nid}>#{ticket.nid}</span>
              <TicketStatusLabel status={ticket.status} />{' '}
              <span>
                <UserLabel user={ticket.author} displayTags={isCustomerService} /> {t('createdAt')}{' '}
                <span title={moment(ticket.created_at).format()}>
                  {moment(ticket.created_at).fromNow()}
                </span>
                {moment(ticket.created_at).fromNow() === moment(ticket.updated_at).fromNow() || (
                  <span>
                    , {t('updatedAt')}{' '}
                    <span title={moment(ticket.updated_at).format()}>
                      {moment(ticket.updated_at).fromNow()}
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
              {this.ticketTimeline(ticket)}
              <div>{timeline}</div>
            </div>

            <div>
              <hr />
              {ticketStatus.isOpened(ticket.status) ? (
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
              ticket={ticket}
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

export default withTranslation()(withRouter(Ticket))
