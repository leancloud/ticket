const _ = require('lodash')
const AV = require('leanengine')

const {getTinyUserInfo, htmlify, isCustomerService, getTinyReplyInfo}= require('./common')
const oauth = require('./oauth')
const notify = require('./notify')
const {TICKET_STATUS, ticketClosedStatuses} = require('../lib/common')
const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('Ticket', (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('noLogin')
  }
  return oauth.hasPermission(req.currentUser)
  .then((hasPremission) => {
    if (!hasPremission) {
      return res.error('您的账号不具备提交工单的条件。')
    }

    const ticket = req.object
    if (!ticket.get('title') || ticket.get('title').trim().length === 0) {
      throw new AV.Cloud.Error('title 不能为空')
    }
    if (!ticket.get('category') || !ticket.get('category').objectId) {
      throw new AV.Cloud.Error('category 不能为空')
    }

    ticket.set('status', TICKET_STATUS.NEW)
    ticket.set('content_HTML', htmlify(ticket.get('content')))
    return getTicketAcl(ticket, req.currentUser).then((acl) => {
      ticket.setACL(acl)
      ticket.set('author', req.currentUser)
      return selectAssignee(ticket)
    }).then((assignee) => {
      ticket.set('assignee', assignee)
      res.success()
    })
  }).catch((err) => {
    errorHandler.captureException(err)
    res.error(err)
  })
})

const getTicketAcl = (ticket, author) => {
  const acl = new AV.ACL()
  acl.setWriteAccess(author, true)
  acl.setReadAccess(author, true)
  acl.setRoleWriteAccess(new AV.Role('customerService'), true)
  acl.setRoleReadAccess(new AV.Role('customerService'), true)
  return Promise.resolve(acl)
}

AV.Cloud.afterSave('Ticket', (req) => {
  req.object.get('assignee').fetch()
  .then((assignee) => {
    return getTinyUserInfo(assignee)
    .then((assigneeInfo) => {
      return new AV.Object('OpsLog').save({
        ticket: req.object,
        action: 'selectAssignee',
        data: {assignee: assigneeInfo},
      }, {useMasterKey: true})
    })
    .then(() => {
      return notify.newTicket(req.object, req.currentUser, assignee)
    })
  }).catch(errorHandler.captureException)
})

AV.Cloud.beforeUpdate('Ticket', (req, res) => {
  if (req.object.updatedKeys.indexOf('assignee') != -1) {
    getVacationers()
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
    }
  })
})

AV.Cloud.define('operateTicket', (req) => {
  const {ticketId, action} = req.params
  return Promise.all([
    new AV.Query('Ticket')
    .include('files')
    .include('author')
    .get(ticketId),
    getTinyUserInfo(req.currentUser),
    isCustomerService(req.currentUser),
  ])
  .then(([ticket, operator, isCustomerService]) => {
    if (isCustomerService) {
      ticket.addUnique('joinedCustomerServices', operator)
    }
    ticket.set('status', getTargetStatus(action, isCustomerService))
    return ticket.save(null, {user: req.currentUser})
    .then(() => {
      return new AV.Object('OpsLog').save({
        ticket,
        action,
        data: {operator}
      }, {useMasterKey: true})
    })
    .then(() => {
      return ticket.toFullJSON()
    })
  })
  .catch(errorHandler.captureException)
})

const getTargetStatus = (action, isCustomerService) => {
  switch (action) {
  case 'replyWithNoContent':
    return TICKET_STATUS.WAITING_CUSTOMER
  case 'replySoon':
    return TICKET_STATUS.WAITING_CUSTOMER_SERVICE
  case 'resolve':
    return isCustomerService ? TICKET_STATUS.PRE_FULFILLED : TICKET_STATUS.FULFILLED
  case 'reject':
    return TICKET_STATUS.REJECTED
  case 'reopen':
    return TICKET_STATUS.WAITING_CUSTOMER
  default:
    throw new Error('unsupport action: ' + action)
  }
}

exports.replyTicket = (ticket, reply, replyAuthor) => {
  Promise.all([
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
    const category = ticket.get('category')
    if (!_.isEmpty(category)) {
      query.equalTo('categories.objectId', category.objectId)
    }
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
