const AV = require('leanengine')

const { forEachAVObject, getOrganizationRoleName } = require('../api/common')

exports.up = function (next) {
  const query = new AV.Query('Reply')
  query.include('ticket')

  return forEachAVObject(query, (reply) => {
    const ticket = reply.get('ticket')
    const organization = ticket.get('organization')

    // don't update tickets without organization field
    if (!organization) return

    // fix acl for organization users
    const acl = new AV.ACL()
    const ticketAuthor = ticket.get('author')
    const replyAuthor = reply.get('author')

    acl.setWriteAccess(replyAuthor, true)
    acl.setReadAccess(replyAuthor, true)
    acl.setReadAccess(ticketAuthor, true)

    const organizationRoleName = getOrganizationRoleName(organization)
    acl.setRoleReadAccess(organizationRoleName, true)

    acl.setRoleReadAccess(new AV.Role('customerService'), true)

    reply.setACL(acl)
    return reply.save(null, { useMasterKey: true })
  })
    .then(() => {
      return next()
    })
    .catch(next)
}

exports.down = function (next) {
  next()
}
