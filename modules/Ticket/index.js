import React, { Component } from 'react'
import { Button, Card, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import { withTranslation } from 'react-i18next'
import { withRouter } from 'react-router-dom'
import moment from 'moment'
import _ from 'lodash'
import xss from 'xss'
import PropTypes from 'prop-types'

import css from './index.css'
import { auth, cloud, db } from '../../lib/leancloud'
import { uploadFiles, getCategoryPathName, getCategoriesTree } from '../common'
import csCss from '../CustomerServiceTickets.css'
import { isTicketOpen, getTinyCategoryInfo } from '../../lib/common'
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

class Ticket extends Component {
  constructor(props) {
    super(props)
    this.state = {
      categoriesTree: [],
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
        if (!ticket) {
          return this.props.history.replace({
            pathname: '/error',
            state: { code: 'Unauthorized' },
          })
        }

        return Promise.all([
          cloud.run('getPrivateTags', { ticketId: ticket.id }),
          getCategoriesTree(false),
          this.getReplyQuery(ticket).find(),
          db.class('Tag').where('ticket', '==', ticket).find(),
          this.getOpsLogQuery(ticket).find(),
          db
            .class('Watch')
            .where('ticket', '==', ticket)
            .where('user', '==', auth.currentUser)
            .first(),
        ]).then(([privateTags, categoriesTree, replies, tags, opsLogs, watch]) => {
          if (privateTags) {
            ticket.set('privateTags', privateTags.privateTags)
          }
          this.setState({
            categoriesTree,
            ticket,
            replies,
            tags,
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

  operateTicket(action) {
    const ticket = this.state.ticket
    return cloud
      .run('operateTicket', { ticketId: ticket.id, action })
      .then(() => {
        return ticket.get({ include: ['author', 'organization', 'assignee', 'files'] })
      })
      .then((ticket) => {
        this.setState({ ticket })
        return
      })
      .catch(this.context.addNotification)
  }

  updateTicketCategory(category) {
    const ticket = this.state.ticket
    return ticket.update({ category: getTinyCategoryInfo(category) }).then(() => {
      ticket.data.category = category
      this.setState({ ticket })
      return
    })
  }

  updateTicketAssignee(assignee) {
    const ticket = this.state.ticket
    return ticket
      .update({ assignee })
      .then(() => {
        ticket.data.assignee = assignee
        return
      })
      .catch(this.context.addNotification)
  }

  saveTag(key, value, isPrivate) {
    const ticket = this.state.ticket
    let tags = ticket.get(isPrivate ? 'privateTags' : 'tags')
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
    return ticket.update({ [isPrivate ? 'privateTags' : 'tags']: tags }).then(() => {
      this.setState({ ticket })
      return
    })
  }

  saveEvaluation(evaluation) {
    const ticket = this.state.ticket
    ticket.data.evaluation = evaluation
    return ticket.update({ evaluation }).then(() => {
      this.setState({ ticket })
      return
    })
  }

  handleAddWatch() {
    return db
      .class('Watch')
      .add({
        ticket: this.state.ticket,
        user: auth.currentUser,
        ACL: {
          [auth.currentUser.id]: { write: true, read: true },
        },
      })
      .then((watch) => {
        this.setState({ watch })
        return
      })
      .catch(this.context.addNotification)
  }

  handleRemoveWatch() {
    return this.state.watch
      .delete()
      .then(() => {
        this.setState({ watch: undefined })
        return
      })
      .catch(this.context.addNotification)
  }

  contentView(content) {
    return <div dangerouslySetInnerHTML={{ __html: myxss.process(content) }} />
  }

  getTime(avObj) {
    if (new Date() - avObj.get('createdAt') > 86400000) {
      return (
        <a
          href={'#' + avObj.id}
          className="timestamp"
          title={moment(avObj.get('createdAt')).format()}
        >
          {moment(avObj.get('createdAt')).calendar()}
        </a>
      )
    } else {
      return (
        <a
          href={'#' + avObj.id}
          className="timestamp"
          title={moment(avObj.get('createdAt')).format()}
        >
          {moment(avObj.get('createdAt')).fromNow()}
        </a>
      )
    }
  }

  ticketTimeline(avObj) {
    const { t } = this.props
    if (avObj.className === 'OpsLog') {
      switch (avObj.get('action')) {
        case 'selectAssignee':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap">
                  <i className="bi bi-arrow-left-right"></i>
                </span>
              </div>
              <div className="ticket-status-right">
                {t('system')} {t('assignedTicketTo')}{' '}
                <UserLabel user={avObj.get('data').assignee} /> ({this.getTime(avObj)})
              </div>
            </div>
          )
        case 'changeCategory':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap">
                  <i className="bi bi-arrow-left-right"></i>
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.get('data').operator} /> {t('changedTicketCategoryTo')}{' '}
                <span className={csCss.category + ' ' + css.category}>
                  {getCategoryPathName(avObj.get('data').category, this.state.categoriesTree)}
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
                  <i className="bi bi-arrow-left-right"></i>
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.get('data').operator} /> {t('changedTicketAssigneeTo')}{' '}
                <UserLabel user={avObj.get('data').assignee} /> ({this.getTime(avObj)})
              </div>
            </div>
          )
        case 'replyWithNoContent':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap">
                  <i className="bi bi-chat-left-fill"></i>
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.get('data').operator} /> {t('thoughtNoNeedToReply')} (
                {this.getTime(avObj)})
              </div>
            </div>
          )
        case 'replySoon':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap awaiting">
                  <i className="bi bi-hourglass"></i>
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.get('data').operator} /> {t('thoughtNeedTime')} (
                {this.getTime(avObj)})
              </div>
            </div>
          )
        case 'resolve':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap resolved">
                  <i className="bi bi-check-circle"></i>
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.get('data').operator} /> {t('thoughtResolved')} (
                {this.getTime(avObj)})
              </div>
            </div>
          )
        case 'close':
        case 'reject': // 向前兼容
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap closed">
                  <i className="bi bi-slash-circle"></i>
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.get('data').operator} /> {t('closedTicket')} (
                {this.getTime(avObj)})
              </div>
            </div>
          )
        case 'reopen':
          return (
            <div className="ticket-status" id={avObj.id} key={avObj.id}>
              <div className="ticket-status-left">
                <span className="icon-wrap reopened">
                  <i className="bi bi-record-circle"></i>
                </span>
              </div>
              <div className="ticket-status-right">
                <UserLabel user={avObj.get('data').operator} /> {t('reopenedTicket')} (
                {this.getTime(avObj)})
              </div>
            </div>
          )
      }
    } else {
      let panelFooter = null
      let imgBody = <div></div>
      const files = avObj.get('files')
      if (files && files.length !== 0) {
        const imgFiles = []
        const otherFiles = []
        files.forEach((f) => {
          const mimeType = f.get('mime_type')
          if (['image/png', 'image/jpeg', 'image/gif'].indexOf(mimeType) != -1) {
            imgFiles.push(f)
          } else {
            otherFiles.push(f)
          }
        })

        if (imgFiles.length > 0) {
          imgBody = imgFiles.map((f) => {
            return (
              <a href={f.data.url} target="_blank" key={f.id}>
                <img src={f.data.url} alt={f.get('name')} />
              </a>
            )
          })
        }

        if (otherFiles.length > 0) {
          const fileLinks = otherFiles.map((f) => {
            return (
              <span key={f.id}>
                <a
                  href={f.data.url + '?attname=' + encodeURIComponent(f.get('name'))}
                  target="_blank"
                >
                  <i className="bi bi-paperclip"></i> {f.get('name')}
                </a>{' '}
              </span>
            )
          })
          panelFooter = <Card.Footer className={css.footer}>{fileLinks}</Card.Footer>
        }
      }
      const userLabel = avObj.get('isCustomerService') ? (
        <span>
          <UserLabel user={avObj.get('author').data} />
          <i className={css.badge}>{t('staff')}</i>
        </span>
      ) : (
        <UserLabel user={avObj.get('author').data} />
      )
      return (
        <Card
          id={avObj.id}
          key={avObj.id}
          className={avObj.get('isCustomerService') ? css.panelModerator : undefined}
        >
          <Card.Header className={css.heading}>
            {userLabel} {t('submittedAt')} {this.getTime(avObj)}
          </Card.Header>
          <Card.Body className={css.content}>
            {this.contentView(avObj.get('content_HTML'))}
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
      this.props.isCustomerService && ticket.get('author').id !== this.props.currentUser.id
    const timeline = _.chain(this.state.replies)
      .concat(this.state.opsLogs)
      .sortBy((data) => data.createdAt)
      .map(this.ticketTimeline.bind(this))
      .value()

    return (
      <>
        <DocumentTitle title={ticket.get('title') + ' - LeanTicket' || 'LeanTicket'} />
        <Row className="mt-3">
          <Col sm={12}>
            {!isCustomerService && <WeekendWarning />}
            <h1>{ticket.get('title')}</h1>
            <div className={css.meta}>
              <span className={csCss.nid}>#{ticket.get('nid')}</span>
              <TicketStatusLabel status={ticket.get('status')} />{' '}
              <span>
                <UserLabel user={ticket.data.author.data} displayTags={isCustomerService} />{' '}
                {t('createdAt')}{' '}
                <span title={moment(ticket.get('createdAt')).format()}>
                  {moment(ticket.get('createdAt')).fromNow()}
                </span>
                {moment(ticket.get('createdAt')).fromNow() ===
                  moment(ticket.get('updatedAt')).fromNow() || (
                  <span>
                    , {t('updatedAt')}{' '}
                    <span title={moment(ticket.get('updatedAt')).format()}>
                      {moment(ticket.get('updatedAt')).fromNow()}
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
                      <i className="bi bi-eye-slash"></i>
                    </Button>
                  </OverlayTrigger>
                ) : (
                  <OverlayTrigger
                    placement="right"
                    overlay={<Tooltip id="tooltip">{t('clickToSubscribe')}</Tooltip>}
                  >
                    <Button variant="link" onClick={this.handleAddWatch.bind(this)}>
                      <i className="bi bi-eye"></i>
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

            {isTicketOpen(ticket) && (
              <div>
                <hr />

                <TicketReply
                  ticket={ticket}
                  commitReply={this.commitReply.bind(this)}
                  commitReplySoon={this.commitReplySoon.bind(this)}
                  operateTicket={this.operateTicket.bind(this)}
                  isCustomerService={isCustomerService}
                />
              </div>
            )}
            {!isTicketOpen(ticket) && (
              <div>
                <hr />

                <Evaluation
                  saveEvaluation={this.saveEvaluation.bind(this)}
                  ticket={ticket}
                  isCustomerService={isCustomerService}
                />
              </div>
            )}
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

export default withTranslation()(withRouter(Ticket))
