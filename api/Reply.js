const _ = require('lodash')
const Promise = require('bluebird')
const AV = require('leanengine')

const ticketStatus = require('../lib/constant').TICKET_STATUS
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
  const reply = req.object
  Promise.all([
    reply.get('ticket').fetch({include: 'author,assignee'}, {user: req.currentUser}),
    common.getTinyReplyInfo(reply),
  ]).spread((ticket, tinyReply) => {
    return uniqJoinedCustomerServices(reply, ticket.get('joinedCustomerServices'))
      .then((joinedCustomerServices) => {
        ticket.set('latestReply', tinyReply)
          .increment('replyCount', 1)
          .set('joinedCustomerServices', joinedCustomerServices)
        if (reply.get('isCustomerService') && ticket.get('status') === ticket.NEW) {
          ticket.set('status', ticketStatus.PENDING)
        }
        ticket.save(null, {user: req.currentUser})
      })
  }).then((ticket) => {
    return notify.replyTicket(ticket, reply, req.currentUser)
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
