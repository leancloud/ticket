const _ = require('lodash')
const AV = require('leanengine')

const { getTinyUserInfo, htmlify, getTinyReplyInfo, isCustomerService } = require('./common')
const { checkPermission } = require('./oauth')
const notification = require('./notification')
const {
  TICKET_ACTION,
  TICKET_STATUS,
  TICKET_OPENED_STATUSES,
  getTicketAcl,
} = require('../lib/common')
const errorHandler = require('./errorHandler')
const { Context } = require('./rule/context')
const { getActiveAutomations } = require('./rule/automation')
const { afterSaveTicketHandler, afterUpdateTicketHandler } = require('./ticket/hook-handler')
const { getVacationerIds, selectAssignee } = require('./ticket/utils')

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
  try {
    afterSaveTicketHandler(req.object)
  } catch (err) {
    errorHandler.captureException(err)
    throw new AV.Cloud.Error('Internal Error', { status: 500 })
  }
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

AV.Cloud.afterUpdate('Ticket', (req) => {
  afterUpdateTicketHandler(req.object, {
    user: req.currentUser,
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
      ticket.set('status', getTargetStatus(action, isCSInThisTicket))
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

AV.Cloud.define('getPrivateTags', (req) => {
  const { ticketId } = req.params
  return isCustomerService(req.currentUser).then((isCustomerService) => {
    if (isCustomerService) {
      return new AV.Query('Ticket').select(['privateTags']).get(ticketId, { useMasterKey: true })
    } else {
      return
    }
  })
})

AV.Cloud.define('exploreTicket', ({ params, currentUser }) => {
  const now = new Date()
  return new AV.Query('Message')
    .equalTo('ticket', AV.Object.createWithoutData('Ticket', params.ticketId))
    .equalTo('to', currentUser)
    .lessThanOrEqualTo('createdAt', now)
    .limit(1000)
    .find({ user: currentUser })
    .then((messages) => {
      messages.forEach((m) => m.set('isRead', true))
      return AV.Object.saveAll(messages, { user: currentUser })
    })
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

const getTargetStatus = (action, isCustomerService) => {
  switch (action) {
    case TICKET_ACTION.REPLY_WITH_NO_CONTENT:
      return TICKET_STATUS.WAITING_CUSTOMER
    case TICKET_ACTION.REPLY_SOON:
      return TICKET_STATUS.WAITING_CUSTOMER_SERVICE
    case TICKET_ACTION.RESOLVE:
      return isCustomerService ? TICKET_STATUS.PRE_FULFILLED : TICKET_STATUS.FULFILLED
    case TICKET_ACTION.CLOSE:
    // 向前兼容
    // eslint-disable-next-line no-fallthrough
    case TICKET_ACTION.REJECT:
      return TICKET_STATUS.CLOSED
    case TICKET_ACTION.REOPEN:
      return TICKET_STATUS.WAITING_CUSTOMER
    default:
      throw new Error('unsupport action: ' + action)
  }
}

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
  const query = new AV.Query('Ticket')
  query.containedIn('status', TICKET_OPENED_STATUSES)
  query.addAscending('createdAt')
  query.limit(1000)
  const [tickets, automations] = await Promise.all([
    query.find({ useMasterKey: true }),
    getActiveAutomations(),
  ])
  const ticketsToUpdate = []
  for (const ticket of tickets) {
    const ctx = new Context(ticket.toJSON())
    automations.exec(ctx)
    if (ctx.isUpdated()) {
      ticketsToUpdate.push(ticket.set(ctx.getUpdatedData()))
    }
  }
  if (ticketsToUpdate.length) {
    await AV.Object.saveAll(ticketsToUpdate, { useMasterKey: true })
  }
}
AV.Cloud.define('tickAutomation', { fetchUser: false, internal: true }, tickAutomation)
