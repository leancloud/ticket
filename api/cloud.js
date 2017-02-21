const _ = require('lodash')
const AV = require('leanengine')

const errorHandler = require('./errorHandler')

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
  response.success('Hello world!')
})

AV.Cloud.beforeSave('Ticket', (req, res) => {
  getTicketAcl(req.object, req.currentUser).then((acl) => {
    req.object.setACL(acl)
    req.object.set('author', req.currentUser)
    return selectAssignee(req.object)
  }).then((assignee) => {
    req.object.set('assignee', assignee)
    res.success()
  }).catch(errorHandler.captureException)
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
  getTinyUserInfo(req.object.get('assignee'))
  .then((assignee) => {
    new AV.Object('OpsLog').save({
      ticket: req.object,
      action: 'selectAssignee',
      data: {assignee},
    }).catch(errorHandler.captureException)
  })
})

const getTinyUserInfo = (user) => {
  if (user.get('username')) {
    return Promise.resolve({
      id: user.id,
      username: user.get('username'),
    })
  }
  return user.fetch().then((user) => {
    return {
      id: user.id,
      username: user.get('username'),
    }
  })
}

const selectAssignee = (ticket) => {
  return new AV.Query(AV.Role)
  .equalTo('name', 'customerService')
  .first()
  .then((role) => {
    const category = ticket.get('category')
    const query = role.getUsers().query()
    if (!_.isEmpty(category)) {
      query.equalTo('categories.objectId', category.objectId)
    }
    return query.find()
  }).then((users) => {
    return _.sample(users)
  })
}

AV.Cloud.afterUpdate('Ticket', (req) => {
  if (req.object.updatedKeys.indexOf('status') != -1) {
    getTinyUserInfo(req.currentUser)
    .then((user) => {
      return new AV.Object('OpsLog').save({
        ticket: req.object,
        action: 'changeStatus',
        data: {status: req.object.get('status'), operator: user},
      })
    }).catch(errorHandler.captureException)
  }
  if (req.object.updatedKeys.indexOf('category') != -1) {
    getTinyUserInfo(req.currentUser)
    .then((user) => {
      return new AV.Object('OpsLog').save({
        ticket: req.object,
        action: 'changeCategory',
        data: {category: req.object.get('category'), operator: user},
      })
    }).catch(errorHandler.captureException)
  }
})

AV.Cloud.beforeSave('Reply', (req, res) => {
  getReplyAcl(req.object, req.currentUser).then((acl) => {
    req.object.setACL(acl)
    req.object.set('author', req.currentUser)
    res.success()
  }).catch(errorHandler.captureException)
})

const getReplyAcl = (reply, author) => {
  return reply.get('ticket').fetch({
    include: 'author'
  }).then((ticket) => {
    const acl = new AV.ACL()
    acl.setWriteAccess(author, true)
    acl.setReadAccess(author, true)
    acl.setReadAccess(ticket.get('author'), true)
    acl.setRoleReadAccess(new AV.Role('customerService'), true)
    return acl
  })
}

AV.Cloud.beforeSave('OpsLog', (req, res) => {
  getOpsLogAcl(req.object).then((acl) => {
    req.object.setACL(acl)
    res.success()
  }).catch(errorHandler.captureException)
})

const getOpsLogAcl = (opsLog) => {
  return opsLog.get('ticket').fetch({
    include: 'author'
  }).then((ticket) => {
    const acl = new AV.ACL()
    acl.setReadAccess(ticket.get('author'), true)
    acl.setRoleReadAccess(new AV.Role('customerService'), true)
    return acl
  })
}

module.exports = AV.Cloud
