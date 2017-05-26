const AV = require('leanengine')

const ticket = require('./Ticket')
const common = require('./common')
const errorHandler = require('./errorHandler')

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
  ticket.replyTicket(req.object.get('ticket'), req.object, req.currentUser)
})

AV.Cloud.define('getReplyView', (req, res) => {
  AV.Object.createWithoutData('Reply', req.params.objectId)
  .fetch({include: 'author,files'}, {user: req.currentUser})
  .then((reply) => {
    reply.set('contentHtml', common.md.render(reply.get('content')))
    return res.success(reply)
  })
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
