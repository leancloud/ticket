const AV = require('leanengine')

const ticket = require('./Ticket')
const common = require('./common')
const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('Reply', async (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('No Login')
  }
  try {
    const reply = req.object
    const ticket = reply.get('ticket')
    await ticket.fetch({include: 'author'}, {user: req.currentUser})
    reply.setACL(getReplyAcl(ticket, req.currentUser))
    reply.set('content_HTML', common.htmlify(reply.get('content')))
    reply.set('author', req.currentUser)
    const isCustomerService = await common.isCustomerService(req.currentUser, ticket.get('author'))
    reply.set('isCustomerService', isCustomerService)
    if (isCustomerService) {
      ticket.increment('unreadCount')
      await ticket.save(null, {user: req.currentUser})
    }
    res.success()
  } catch (error) {
    errorHandler.captureException(error)
    res.error('Internal Error')
  }
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
