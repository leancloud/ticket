const _ = require('lodash')
const AV = require('leanengine')

const common = require('./common')
const leancloud = require('./leancloud')
const notify = require('./notify')
const TICKET_STATUS = require('../lib/constant').TICKET_STATUS
const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('Ticket', (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('noLogin')
  }
  leancloud.hasPermission(req.currentUser)
  .then((hasPremission) => {
    if (!hasPremission) {
      return res.error('您的账号不具备提交工单的条件。')
    }

    req.object.set('status', TICKET_STATUS.NEW)
    getTicketAcl(req.object, req.currentUser).then((acl) => {
      req.object.setACL(acl)
      req.object.set('author', req.currentUser)
      return selectAssignee(req.object)
    }).then((assignee) => {
      req.object.set('assignee', assignee)
      res.success()
    }).catch(errorHandler.captureException)
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
    return common.getTinyUserInfo(assignee)
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
  return common.getTinyUserInfo(req.currentUser).then((user) => {
    if (req.object.updatedKeys.indexOf('category') != -1) {
      new AV.Object('OpsLog').save({
        ticket: req.object,
        action: 'changeCategory',
        data: {category: req.object.get('category'), operator: user},
      }, {useMasterKey: true})
    }
    if (req.object.updatedKeys.indexOf('assignee') != -1) {
      common.getTinyUserInfo(req.object.get('assignee'))
      .then((assignee) => {
        return new AV.Object('OpsLog').save({
          ticket: req.object,
          action: 'changeAssignee',
          data: {assignee: assignee, operator: user},
        }, {useMasterKey: true})
      })
      .then(() => {
        return notify.changeAssignee(req.object, req.currentUser, req.object.get('assignee'))
      })
    }
    if (req.object.updatedKeys.indexOf('evaluation') != -1) {
      return req.object.fetch({include: 'assignee'}, {user: req.currentUser})
      .then((ticket) => {
        return notify.ticketEvaluation(ticket, req.currentUser, ticket.get('assignee'))
      })
    }
  })
})

AV.Cloud.define('getTicket', (req, res) => {
  return new AV.Query('Ticket')
  .equalTo('nid', req.params.nid)
  .include('author')
  .include('files')
  .first({user: req.currentUser})
  .then(ticket => {
    if (!ticket) {
      return res.error('notFound')
    }
    ticket.set('contentHtml', common.md.render(ticket.get('content')))
    return res.success(ticket.toFullJSON())
  }).catch(console.error)
})

AV.Cloud.define('htmlify', (req) => {
  const {content, contents} = req.params
  if (content) {
    return common.md.render(content)
  }
  if (contents) {
    return contents.map(content => common.md.render(content))
  }
  return null
})

AV.Cloud.define('operateTicket', (req) => {
  const {ticketId, action} = req.params
  return Promise.all([
    new AV.Query('Ticket')
    .include('files')
    .include('author')
    .get(ticketId),
    common.getTinyUserInfo(req.currentUser),
    common.isCustomerService(req.currentUser),
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
      ticket.set('contentHtml', common.md.render(ticket.get('content')))
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
    common.getTinyReplyInfo(reply),
    common.getTinyUserInfo(reply.get('author'))
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
