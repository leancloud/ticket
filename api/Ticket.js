const _ = require('lodash')
const AV = require('leanengine')
const throat = require('throat').default

const events = require('../next/api/dist/events').default
const { getTinyUserInfo, htmlify, getTinyReplyInfo, isCustomerService } = require('./common')
const { checkPermission } = require('../oauth/lc')
const {
  TICKET_ACTION,
  TICKET_STATUS,
  TICKET_OPENED_STATUSES,
  getTicketAcl,
  ticketStatus,
} = require('../lib/common')
const errorHandler = require('./errorHandler')
const { Automations } = require('./rule/automation')
const { getVacationerIds, selectAssignee, getActionStatus, selectGroup } = require('./ticket/utils')
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
    const categoryId = ticket.get('category').objectId
    const assignee = await selectAssignee(categoryId)
    if (assignee) ticket.set('assignee', assignee)
    const group = await selectGroup(categoryId)
    if (group) ticket.set('group', group)
  } catch (err) {
    errorHandler.captureException(err)
    throw new AV.Cloud.Error('Internal Error: ' + err.message, { status: 500 })
  }
})

/**
 * @param {AV.Object} ticket
 */
function ticketObjectToEventTicket(ticket) {
  return {
    id: ticket.id,
    nid: ticket.get('nid'),
    categoryId: ticket.get('category').objectId,
    authorId: ticket.get('author').id,
    organizationId: ticket.get('organization')?.id,
    assigneeId: ticket.get('assignee')?.id,
    groupId: ticket.get('group')?.id,
    title: ticket.get('title'),
    content: ticket.get('content'),
    status: ticket.get('status'),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  }
}

/**
 * @param {AV.Object} ticket
 * @param {string[]} updatedKeys
 */
function getUpdateEventData(ticket, updatedKeys) {
  const data = {}
  if (updatedKeys.includes('category')) {
    data.categoryId = ticket.get('category').objectId
  }
  if (updatedKeys.includes('organization')) {
    data.organizationId = ticket.get('organization')?.id ?? null
  }
  if (updatedKeys.includes('assignee')) {
    data.assigneeId = ticket.get('assignee')?.id ?? null
  }
  if (updatedKeys.includes('group')) {
    data.groupId = ticket.get('group')?.id ?? null
  }
  if (updatedKeys.includes('evaluation')) {
    data.evaluation = ticket.get('evaluation')
  }
  if (updatedKeys.includes('status')) {
    data.status = ticket.get('status')
  }
  return data
}

AV.Cloud.afterSave('Ticket', async (req) => {
  const ticket = req.object
  if (ticket.get('assignee')) {
    const assigneeInfo = await getTinyUserInfo(ticket.get('assignee'))
    new AV.Object('OpsLog', {
      ticket,
      action: 'selectAssignee',
      data: { assignee: assigneeInfo },
    })
      .save(null, { useMasterKey: true })
      .catch(errorHandler.captureException)
  }

  invokeWebhooks('ticket.create', { ticket: ticket.toJSON() })

  events.emit('ticket:created', {
    ticket: ticketObjectToEventTicket(ticket),
    currentUserId: req.currentUser.id,
  })
})

AV.Cloud.beforeUpdate('Ticket', async (req) => {
  const ticket = req.object
  const originalTicket = AV.Object.createWithoutData('Ticket', ticket.id)
  await originalTicket.fetch({}, { useMasterKey: true })

  if (ticket.updatedKeys.includes('assignee')) {
    if (ticket.get('assignee')) {
      const vacationerIds = await getVacationerIds()
      if (vacationerIds.includes(ticket.get('assignee').id)) {
        throw new AV.Cloud.Error('Sorry, this customer service is in vacation.')
      }
    }
  }

  events.emit('ticket:updated', {
    originalTicket: ticketObjectToEventTicket(originalTicket),
    data: getUpdateEventData(ticket, ticket.updatedKeys),
    currentUserId: req.currentUser.id,
  })
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
    await AV.Object.saveAll(tickets.concat(opsLogs), { user: req.currentUser, useMasterKey: true })
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
  events.emit('reply:created', {
    reply: {
      id: reply.id,
      ticketId: ticket.id,
      authorId: reply.get('author').id,
      content: reply.get('content'),
      isCustomerService: reply.get('isCustomerService'),
      internal: false,
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
    },
    currentUserId: replyAuthor.id,
  })

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
      await automations.exec(ctx)
      if (ctx.ticket.isUpdated()) {
        run(() => ctx.ticket.save())
        count++
      }
    }
  }
}
