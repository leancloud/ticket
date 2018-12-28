const AV = require('leanengine')

const ticket = require('./Ticket')
const common = require('./common')
const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('Reply', (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('noLogin')
  }
  const reply = req.object
  return reply.get('ticket').fetch({
    include: 'author'
  }, {user: req.currentUser}).then((ticket) => {
    reply.setACL(getReplyAcl(ticket, req.currentUser))
    reply.set('content_HTML', common.htmlify(reply.get('content')))
    reply.set('author', req.currentUser)
    return common.isCustomerService(req.currentUser, ticket.get('author'))
  }).then((isCustomerService) => {
    reply.set('isCustomerService', isCustomerService)
    res.success()
    return
  }).catch(errorHandler.captureException)
})

AV.Cloud.afterSave('Reply', (req) => {
  ticket.replyTicket(req.object.get('ticket'), req.object, req.currentUser)
})

const getReplyAcl = (ticket, author) => {
  const acl = new AV.ACL()
  acl.setWriteAccess(author, true)
  acl.setReadAccess(author, true)
  acl.setReadAccess(ticket.get('author'), true)

  const organization = ticket.get('organization')
  if (organization) {
    const organizationRoleName = common.getOrganizationRoleName(organization)
    acl.setRoleReadAccess(organizationRoleName, true)
  }

  acl.setRoleReadAccess(new AV.Role('customerService'), true)
  return acl
}
