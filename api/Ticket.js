const _ = require('lodash')
const AV = require('leanengine')
const throat = require('throat').default

const { getTinyUserInfo, htmlify, getTinyReplyInfo, isCustomerService } = require('./common')
const { checkPermission } = require('./oauth')
const notification = require('./notification')
const {
  TICKET_ACTION,
  TICKET_STATUS,
  TICKET_OPENED_STATUSES,
  getTicketAcl,
  ticketStatus,
} = require('../lib/common')
const errorHandler = require('./errorHandler')
const { Automations } = require('./rule/automation')
const { getVacationerIds, selectAssignee, getActionStatus } = require('./ticket/utils')
const { invokeWebhooks } = require('./webhook')
const Ticket = require('./ticket/model')

AV.Cloud.beforeSave('Ticket', async (req) => {
  if (!req.currentUser || !(await checkPermission(req.currentUser))) {
    throw new AV.Cloud.Error('Forbidden', { status: 403 })
  }

  const ticket = req.object
  if (!ticket.get('title') || ticket.get('title').trim().length === 0) {
    throw new AV.Cloud.Error('Ticket title must be provided')
  }
  if (!ticket.get('category') || !ticket.get('category').objectId) {
    throw new AV.Cloud.Error('Ticket category must be provided')
  }
  ticket.setACL(new AV.ACL(getTicketAcl(req.currentUser, ticket.get('organization'))))
  ticket.set('status', TICKET_STATUS.NEW)
  ticket.set('content_HTML', htmlify(ticket.get('content')))
  ticket.set('author', req.currentUser)

  try {
    const assignee = await selectAssignee(ticket.get('category').objectId)
    ticket.set('assignee', assignee)
  } catch (err) {
    errorHandler.captureException(err)
    throw new AV.Cloud.Error('Internal Error', { status: 500 })
  }
})

AV.Cloud.afterSave('Ticket', async (req) => {
  const ticket = req.object
  const assigneeInfo = await getTinyUserInfo(ticket.get('assignee'))
  new AV.Object('OpsLog', {
    ticket,
    action: 'selectAssignee',
    data: { assignee: assigneeInfo },
  })
    .save(null, { useMasterKey: true })
    .catch(errorHandler.captureException)
  notification.newTicket(ticket, req.currentUser, ticket.get('assignee'))
  invokeWebhooks('ticket.create', { ticket: ticket.toJSON() })
})

AV.Cloud.beforeUpdate('Ticket', async (req) => {
  const ticket = req.object
  if (ticket.updatedKeys.includes('assignee')) {
    const vacationerIds = await getVacationerIds()
    if (vacationerIds.includes(ticket.get('assignee').id)) {
      throw new AV.Cloud.Error('Sorry, this customer service is in vacation.')
    }
  }
})

AV.Cloud.afterUpdate('Ticket', async (req) => {
  const ticket = req.object
  const updatedKeys = new Set(ticket.updatedKeys)
  const userInfo = await getTinyUserInfo(req.currentUser)
  const opsLogs = []
  const addOpsLog = (action, data) => {
    data.operator = userInfo
    opsLogs.push(new AV.Object('OpsLog', { ticket, action, data }))
  }

  if (updatedKeys.has('category')) {
    addOpsLog('changeCategory', { category: ticket.get('category') })
  }

  if (updatedKeys.has('assignee')) {
    const assigneeInfo = await getTinyUserInfo(ticket.get('assignee'))
    addOpsLog('changeAssignee', { assignee: assigneeInfo })
    notification.changeAssignee(ticket, req.currentUser, ticket.get('assignee'))
  }

  if (updatedKeys.has('evaluation')) {
    // use side effect
    await getTinyUserInfo(ticket.get('assignee'))
    notification.ticketEvaluation(ticket, req.currentUser, ticket.get('assignee'))
  }

  if (updatedKeys.has('status') && ticketStatus.isClosed(ticket.get('status'))) {
    AV.Cloud.run('statsTicket', { ticketId: ticket.id }).catch(errorHandler.captureException)
  }

  if (opsLogs.length === 1) {
    opsLogs[0].save(null, { useMasterKey: true }).catch(errorHandler.captureException)
  }
  if (opsLogs.length > 1) {
    AV.Object.saveAll(opsLogs, { useMasterKey: true }).catch(errorHandler.captureException)
  }

  invokeWebhooks('ticket.update', {
    ticket: ticket.toJSON(),
    updatedKeys: ticket.updatedKeys,
  })
})

AV.Cloud.define('operateTicket', async (req) => {
  if (!req.currentUser) {
    throw new AV.Cloud.Error('Unauthorized', { status: 401 })
  }

  const { ticketId, action } = req.params
  if (!ticketId || !action) {
    throw new AV.Cloud.Error('The ticketId and action must be provided', { status: 400 })
  }

  const ticketIds = _.uniq(Array.isArray(ticketId) ? ticketId : [ticketId])
  if (ticketIds.find((id) => typeof id !== 'string')) {
    throw new AV.Cloud.Error('The ticketId must be a string or an array of string', { status: 400 })
  }

  try {
    const [tickets, operator] = await Promise.all([
      new AV.Query('Ticket')
        .select('author')
        .containedIn('objectId', ticketIds)
        .find({ user: req.currentUser }),
      getTinyUserInfo(req.currentUser),
    ])
    if (tickets.length !== ticketIds.length) {
      const set = new Set(tickets.map((t) => t.id))
      throw new AV.Cloud.Error(`Ticket(${ticketIds.find((id) => !set.has(id))}) not exists`, {
        status: 404,
      })
    }

    const isCS = await isCustomerService(req.currentUser)

    const opsLogs = []
    tickets.forEach((ticket) => {
      const isCSInThisTicket = isCS && ticket.get('author').id !== req.currentUser.id
      if (isCSInThisTicket) {
        ticket.addUnique('joinedCustomerServices', operator)
        if (action === TICKET_ACTION.CLOSE || action === TICKET_ACTION.REOPEN) {
          ticket.increment('unreadCount')
        }
      }
      ticket.set('status', getActionStatus(action, isCSInThisTicket))
      opsLogs.push(
        new AV.Object('OpsLog', {
          ticket,
          action,
          data: { operator },
        })
      )
    })
    await AV.Object.saveAll(tickets.concat(opsLogs), { useMasterKey: true })
  } catch (error) {
    if (error instanceof AV.Cloud.Error) {
      throw error
    } else {
      errorHandler.captureException(error)
      throw new AV.Cloud.Error('Internal Error', { status: 500 })
    }
  }
})

AV.Cloud.define('resetTicketUnreadCount', async (req) => {
  if (!req.currentUser) {
    throw new AV.Cloud.Error('unauthorized', { status: 401 })
  }
  const query = new AV.Query('Ticket')
  query.equalTo('author', req.currentUser)
  query.greaterThan('unreadCount', 0)
  const tickets = await query.find({ user: req.currentUser })
  tickets.forEach((ticket) => ticket.set('unreadCount', 0))
  await AV.Object.saveAll(tickets, { user: req.currentUser })
})

exports.replyTicket = (ticket, reply, replyAuthor) => {
  return Promise.all([
    ticket.fetch({ include: 'author,assignee' }, { user: replyAuthor }),
    getTinyReplyInfo(reply),
    getTinyUserInfo(reply.get('author')),
  ])
    .then(([ticket, tinyReply, tinyReplyAuthor]) => {
      ticket.set('latestReply', tinyReply).increment('replyCount', 1)
      if (reply.get('isCustomerService')) {
        ticket.addUnique('joinedCustomerServices', tinyReplyAuthor)
        ticket.set('status', TICKET_STATUS.WAITING_CUSTOMER)
        ticket.increment('unreadCount')
      } else {
        ticket.set('status', TICKET_STATUS.WAITING_CUSTOMER_SERVICE)
      }
      return ticket.save(null, { user: replyAuthor })
    })
    .then((ticket) => {
      return notification.replyTicket(ticket, reply, replyAuthor)
    })
    .then(() => {
      return ticket
    })
    .catch(errorHandler.captureException)
}

async function tickAutomation() {
  const automations = await Automations.get()
  const run = throat(3)
  const getQuery = (cursor) => {
    const query = new AV.Query('Ticket')
    query.containedIn('status', TICKET_OPENED_STATUSES)
    query.addAscending('createdAt')
    query.limit(1000)
    if (cursor) {
      query.greaterThan('createdAt', cursor)
    }
    return query
  }

  let cursor = null
  let count = 0
  while (count < 1000) {
    const query = getQuery(cursor)
    const tickets = await query.find({ useMasterKey: true })
    if (tickets.length === 0) {
      break
    }
    cursor = _.last(tickets).createdAt

    for (const ticket of tickets) {
      const ctx = { ticket: new Ticket(ticket) }
      automations.exec(ctx)
      if (ctx.ticket.isUpdated()) {
        run(() => ctx.ticket.save())
        count++
      }
    }
  }
}
AV.Cloud.define('tickAutomation', { fetchUser: false, internal: true }, tickAutomation)
