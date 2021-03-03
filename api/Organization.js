const _ = require('lodash')
const AV = require('leanengine')

const { forEachAVObject, getTicketAcl } = require('./common')

AV.Cloud.define('leaveOrganization', ({ params, currentUser }) => {
  const { organizationId } = params
  return AV.Object.createWithoutData('Organization', organizationId)
    .fetch({ include: 'adminRole,memberRole' }, { useMasterKey: true })
    .then((organization) => {
      const adminRole = organization.get('adminRole')
      return adminRole
        .getUsers()
        .query()
        .find({ useMasterKey: true })
        .then((admins) => {
          const isAdmin = _.find(admins, { id: currentUser.id })
          if (!isAdmin) {
            return
          }
          if (admins.length == 1) {
            throw new AV.Cloud.Error('该组织至少需要一名管理员。')
          }
          adminRole.getUsers().remove(currentUser)
          return adminRole.save(null, { useMasterKey: true })
        })
        .then(() => {
          const memberRole = organization.get('memberRole')
          memberRole.getUsers().remove(currentUser)
          return memberRole.save(null, { useMasterKey: true })
        })
    })
    .then(() => {
      return
    })
})

AV.Cloud.afterDelete('Organization', (req) => {
  const org = AV.Object.createWithoutData('Organization', req.object.id)
  return forEachAVObject(
    new AV.Query('Ticket').equalTo('organization', org),
    (ticket) => {
      ticket.unset('organization')
      ticket.setACL(getTicketAcl(ticket.get('author')))
      return ticket.save(null, { user: req.currentUser })
    },
    { user: req.currentUser }
  )
})
