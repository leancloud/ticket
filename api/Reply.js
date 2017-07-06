const AV = require('leanengine')

const ticket = require('./Ticket')
const common = require('./common')
const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('Reply', (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('noLogin')
  }
  req.object.set('content_HTML', common.htmlify(req.object.get('content')))
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
