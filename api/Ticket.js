const _ = require('lodash')
const AV = require('leanengine')

const {getTinyUserInfo, htmlify, getTinyReplyInfo, isCustomerService} = require('./common')
const {checkPermission} = require('./oauth')
const notify = require('./notify')
const {TICKET_ACTION, TICKET_STATUS, ticketClosedStatuses, getTicketAcl} = require('../lib/common')
const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('Ticket', async (req) => {
  if (!req.currentUser || !await checkPermission(req.currentUser)) {
    throw new AV.Cloud.Error('Forbidden', {status: 403})
  }

  const ticket = req.object
  if (!ticket.get('title') || ticket.get('title').trim().length === 0) {
    throw new AV.Cloud.Error('Ticket title must be provided')
  }
  if (!ticket.get('category') || !ticket.get('category').objectId) {
    throw new AV.Cloud.Error('Ticket category must be provided')
  }
  ticket.setACL(getTicketAcl(req.currentUser), ticket.get('organization'))
  ticket.set('status', TICKET_STATUS.NEW)
  ticket.set('content_HTML', htmlify(ticket.get('content')))
  ticket.set('author', req.currentUser)

  try {
    const assignee = await selectAssignee(ticket)
    ticket.set('assignee', assignee)
  } catch (err) {
    errorHandler.captureException(err)
    throw new AV.Cloud.Error('Internal Error', {status: 500})
  }
})

AV.Cloud.afterSave('Ticket', async (req) => {
  const ticket = req.object
  try {
    await ticket.fetch({include: 'assignee'}, {user: req.currentUser})
    const assignee = ticket.get('assignee')
    const assigneeInfo = await getTinyUserInfo(assignee)
    await new AV.Object('OpsLog')
      .save({
        ticket: req.object,
        action: 'selectAssignee',
        data: {assignee: assigneeInfo},
      }, {useMasterKey: true})
    await notify.newTicket(req.object, req.currentUser, assignee)
  } catch (err) {
    errorHandler.captureException(err)
    throw new AV.Cloud.Error('Internal Error', {status: 500})
  }
})

AV.Cloud.beforeUpdate('Ticket', async (req) => {
  const ticket = req.object
  if (ticket.updatedKeys.includes('assignee')) {
    const assignee = ticket.get('assignee')
    const vacationers = await getVacationers()
    if (_.find(vacationers, {id: assignee.id})) {
      throw new AV.Cloud.Error('Sorry, this customer service is in vacation.')
    }
  }
})

AV.Cloud.afterUpdate('Ticket', (req) => {
  const ticket = req.object
  return getTinyUserInfo(req.currentUser).then((user) => {
    if (ticket.updatedKeys.includes('category')) {
      new AV.Object('OpsLog').save({
        ticket,
        action: 'changeCategory',
        data: {category: ticket.get('category'), operator: user},
      }, {useMasterKey: true})
      .catch(errorHandler.captureException)
    }
    if (ticket.updatedKeys.includes('assignee')) {
      getTinyUserInfo(ticket.get('assignee'))
      .then((assignee) => {
        return new AV.Object('OpsLog').save({
          ticket,
          action: 'changeAssignee',
          data: {assignee: assignee, operator: user},
        }, {useMasterKey: true})
      })
      .then(() => {
        return notify.changeAssignee(ticket, req.currentUser, ticket.get('assignee'))
      })
      .catch(errorHandler.captureException)
    }
    if (ticket.updatedKeys.includes('status')
        && ticketClosedStatuses().includes(ticket.get('status'))) {
      AV.Cloud.run('statsTicket', {ticketId: ticket.id})
      .catch(errorHandler.captureException)
    }
    if (ticket.updatedKeys.includes('evaluation')) {
      ticket.fetch({include: 'assignee'}, {user: req.currentUser})
      .then((ticket) => {
        return notify.ticketEvaluation(ticket, req.currentUser, ticket.get('assignee'))
      })
      .catch(errorHandler.captureException)
    }
    return
  })
})

AV.Cloud.define('operateTicket', async (req) => {
  const {ticketId, action} = req.params
  try {
    const [ticket, operator] = await Promise.all([
      new AV.Query('Ticket').get(ticketId, {user: req.currentUser}),
      getTinyUserInfo(req.currentUser),
    ])
    const isCustomerService = await isCustomerService(req.currentUser, ticket.get('author'))
    if (isCustomerService) {
      ticket.addUnique('joinedCustomerServices', operator)
      if (action === TICKET_ACTION.CLOSE || action === TICKET_ACTION.REOPEN) {
        ticket.increment('unreadCount')
      }
    }
    ticket.set('status', getTargetStatus(action, isCustomerService))
    await ticket.save(null, {user: req.currentUser})
    await new AV.Object('OpsLog')
      .save({
        ticket,
        action,
        data: {operator}
      }, {useMasterKey: true})
  } catch (error) {
    errorHandler.captureException(error)
    throw new AV.Cloud.Error('Internal Error', {status: 500})
  }
})

AV.Cloud.define('getPrivateTags', (req) => {
  const {ticketId} = req.params
  return isCustomerService(req.currentUser)
  .then(isCustomerService => {
    if (isCustomerService) {
      return new AV.Query('Ticket')
      .select(['privateTags'])
      .get(ticketId, {useMasterKey: true})
    } else {
      return
    }
  })
})

AV.Cloud.define('exploreTicket', ({params, currentUser}) => {
  const now = new Date()
  return new AV.Query('Message')
    .equalTo('ticket', AV.Object.createWithoutData('Ticket', params.ticketId))
    .equalTo('to', currentUser)
    .lessThanOrEqualTo('createdAt', now)
    .limit(1000)
    .find({user: currentUser})
    .then(messages => {
      messages.forEach(m => m.set('isRead', true))
      return AV.Object.saveAll(messages, {user: currentUser})
    })
})

AV.Cloud.define('resetTicketUnreadCount', async (req) => {
  if (!req.currentUser) {
    throw new AV.Cloud.Error('unauthorized', {status: 401})
  }
  const query = new AV.Query('Ticket')
  query.equalTo('author', req.currentUser)
  query.greaterThan('unreadCount', 0)
  const tickets = await query.find({user: req.currentUser})
  tickets.forEach(ticket => ticket.set('unreadCount', 0))
  await AV.Object.saveAll(tickets, {user: req.currentUser})
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
    ticket.fetch({include: 'author,assignee'}, {user: replyAuthor}),
    getTinyReplyInfo(reply),
    getTinyUserInfo(reply.get('author'))
  ]).then(([ticket, tinyReply, tinyReplyAuthor]) => {
    ticket.set('latestReply', tinyReply)
      .increment('replyCount', 1)
    if (reply.get('isCustomerService')) {
      ticket.addUnique('joinedCustomerServices', tinyReplyAuthor)
      ticket.set('status', TICKET_STATUS.WAITING_CUSTOMER)
      ticket.increment('unreadCount')
    } else {
      ticket.set('status', TICKET_STATUS.WAITING_CUSTOMER_SERVICE)
    }
    return ticket.save(null, {user: replyAuthor})
  }).then((ticket) => {
    return notify.replyTicket(ticket, reply, replyAuthor)
  }).then(() => {
    return ticket
  }).catch(errorHandler.captureException)
}

const selectAssignee = async (ticket) => {
  const [role, vacationers] = await Promise.all([
    new AV.Query(AV.Role)
      .equalTo('name', 'customerService')
      .first(),
    getVacationers(),
  ])
  let query = role.getUsers().query()
  query.equalTo('categories.objectId', ticket.get('category').objectId)
  if (vacationers.length > 0) {
    query.notContainedIn('objectId', vacationers.map(v => v.id))
  }

  const users = await query.find({useMasterKey: true})
  if (users.length > 0) {
    return _.sample(users)
  }

  query = role.getUsers().query()
  if (vacationers.length > 0) {
    query.notContainedIn('objectId', vacationers.map(v => v.id))
  }
  return query.find({useMasterKey: true}).then(_.sample)
}

const getVacationers = () => {
  const now = new Date()
  return new AV.Query('Vacation')
  .lessThan('startDate', now)
  .greaterThan('endDate', now)
  .find({useMasterKey: true})
  .then(vacations => {
    return vacations.map(v => v.get('vacationer'))
  })
}
