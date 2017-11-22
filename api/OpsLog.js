const AV = require('leanengine')

const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('OpsLog', (req, res) => {
  getOpsLogAcl(req.object).then((acl) => {
    req.object.setACL(acl)
    res.success()
    return
  }).catch(errorHandler.captureException)
})

const getOpsLogAcl = (opsLog) => {
  return opsLog.get('ticket').fetch({
    include: 'author'
  }, {useMasterKey: true}).then((ticket) => {
    const acl = new AV.ACL()
    acl.setReadAccess(ticket.get('author'), true)
    acl.setRoleReadAccess(new AV.Role('customerService'), true)
    return acl
  })
}

