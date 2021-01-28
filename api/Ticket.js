const _ = require('lodash')
const AV = require('leanengine')

const common = require('./common')
const {getTinyUserInfo, htmlify, getTinyReplyInfo} = common
const oauth = require('./oauth')
const notify = require('./notify')
const {TICKET_STATUS, ticketClosedStatuses, getTicketAcl} = require('../lib/common')
const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('Ticket', (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('noLogin')
  }
  return oauth.checkPermission(req.currentUser)
  .then(() => {
    const ticket = req.object
    if (!ticket.get('title') || ticket.get('title').trim().length === 0) {
      throw new AV.Cloud.Error('title 不能为空')
    }
    if (!ticket.get('category') || !ticket.get('category').objectId) {
      throw new AV.Cloud.Error('category 不能为空')
    }

    ticket.setACL(getTicketAcl(req.currentUser), ticket.get('organization'))
    ticket.set('status', TICKET_STATUS.NEW)
    ticket.set('content_HTML', htmlify(ticket.get('content')))
    ticket.set('author', req.currentUser)
    return selectAssignee(ticket)
    .then((assignee) => {
      ticket.set('assignee', assignee)
      res.success()
      return
    })
  }).catch((err) => {
    errorHandler.captureException(err)
    res.error(err)
  })
})

AV.Cloud.afterSave('Ticket', (req) => {
  req.object.fetch({include: 'assignee'}, {user: req.currentUser})
  .then(ticket => {
    return getTinyUserInfo(ticket.get('assignee'))
    .then((assigneeInfo) => {
      return new AV.Object('OpsLog').save({
        ticket: req.object,
        action: 'selectAssignee',
        data: {assignee: assigneeInfo},
      }, {useMasterKey: true})
    })
    .then(() => {
      return notify.newTicket(req.object, req.currentUser, ticket.get('assignee'))
    })
  }).catch(errorHandler.captureException)
})

AV.Cloud.beforeUpdate('Ticket', (req, res) => {
  if (req.object.updatedKeys.indexOf('assignee') != -1) {
    return getVacationers()
    .then(vacationers => {
      const finded = _.find(vacationers, {id: req.object.get('assignee').id})
      if (finded) {
        return res.error('抱歉，该客服正在休假。')
      }
      return res.success()
    })
  } else {
    return res.success()
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

AV.Cloud.define('operateTicket', async (req, res) => {
  const {ticketId, action} = req.params
  try {
    const [ticket, operator] = await Promise.all([
      new AV.Query('Ticket').get(ticketId, {user: req.currentUser}),
      getTinyUserInfo(req.currentUser),
    ])
    const isCustomerService = await common.isCustomerService(req.currentUser, ticket.get('author'))
    if (isCustomerService) {
      ticket.addUnique('joinedCustomerServices', operator)
      ticket.increment('unreadCount')
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
    res.error('Internal Error')
  }
})

AV.Cloud.define('getPrivateTags', (req) => {
  const {ticketId} = req.params
  return common.isCustomerService(req.currentUser)
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
  const {ticketIds} = req.params
  if (!Array.isArray(ticketIds)) {
    throw new AV.Cloud.Error('"ticketIds" should be an array', {status: 400})
  }
  const tickets = []
  ticketIds.forEach(id => {
    const ticket = AV.Object.createWithoutData('Ticket', id)
    ticket.set('unreadCount', 0)
    tickets.push(ticket)
  })
  await AV.Object.saveAll(tickets, {user: req.currentUser})
})

const getTargetStatus = (action, isCustomerService) => {
  switch (action) {
  case 'replyWithNoContent':
    return TICKET_STATUS.WAITING_CUSTOMER
  case 'replySoon':
    return TICKET_STATUS.WAITING_CUSTOMER_SERVICE
  case 'resolve':
    return isCustomerService ? TICKET_STATUS.PRE_FULFILLED : TICKET_STATUS.FULFILLED
  case 'close':
  // 向前兼容
  case 'reject':
    return TICKET_STATUS.CLOSED
  case 'reopen':
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

const selectAssignee = (ticket) => {
  return Promise.all([
    new AV.Query(AV.Role)
    .equalTo('name', 'customerService')
    .first(),
    getVacationers(),
  ])
  .then(([role, vacationers]) => {
    let query = role.getUsers().query()
    query.equalTo('categories.objectId', ticket.get('category').objectId)
    if (vacationers.length > 0) {
      query.notContainedIn('objectId', vacationers.map(v => v.id))
    }
    return query.find({useMasterKey: true})
    .then((users) => {
      if (users.length != 0) {
        return _.sample(users)
      }

      query = role.getUsers().query()
      if (vacationers.length > 0) {
        query.notContainedIn('objectId', vacationers.map(v => v.id))
      }
      return query.find({useMasterKey: true}).then(_.sample)
    })
  })
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
