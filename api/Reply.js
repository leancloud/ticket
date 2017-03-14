const _ = require('lodash')
const Promise = require('bluebird')
const AV = require('leanengine')

const common = require('./common')
const errorHandler = require('./errorHandler')
const notify = require('./notify')

AV.Cloud.beforeSave('Reply', (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('noLogin')
  }
  req.object.set('content', req.object.get('content'))
  getReplyAcl(req.object, req.currentUser).then((acl) => {
    req.object.setACL(acl)
    req.object.set('author', req.currentUser)
    return common.isCustomerService(req.currentUser)
  }).then((isCustomerService) => {
    req.object.set('isCustomerService', isCustomerService)
    res.success()
  }).catch(errorHandler.captureException)
})

AV.Cloud.afterSave('Reply', (req) => {
  Promise.all([
    req.object.get('ticket').fetch({include: 'author,assignee'}),
    common.getTinyReplyInfo(req.object),
  ]).spread((ticket, reply) => {
    return uniqJoinedCustomerServices(req.object, ticket.get('joinedCustomerServices'))
      .then((joinedCustomerServices) => {
        return ticket.set('latestReply', reply)
          .increment('replyCount', 1)
          .set('joinedCustomerServices', joinedCustomerServices)
          .save({user: req.currentUser})
      })
  }).then((ticket) => {
    return notify.replyTicket(ticket, req.object, req.currentUser)
  }).catch(errorHandler.captureException)
})

const getReplyAcl = (reply, author) => {
  return reply.get('ticket').fetch({
    include: 'author'
  }, {user: author}).then((ticket) => {
    const acl = new AV.ACL()
    acl.setWriteAccess(author, true)
    acl.setReadAccess(author, true)
    acl.setReadAccess(ticket.get('author'), true)
    acl.setRoleReadAccess(new AV.Role('customerService'), true)
    return acl
  })
}

const uniqJoinedCustomerServices = (reply, joinedCustomerServices) => {
  joinedCustomerServices = joinedCustomerServices || []
  if (!reply.get('isCustomerService')) {
    return Promise.resolve(joinedCustomerServices)
  }
  return common.getTinyUserInfo(reply.get('author')).then((user) => {
    joinedCustomerServices.push(user)
    return _.uniqBy(joinedCustomerServices, 'objectId')
  })
}
