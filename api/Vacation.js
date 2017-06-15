const AV = require('leanengine')

AV.Cloud.beforeSave('Vacation', (req, res) => {
  req.object.set('operator', req.currentUser)
  const acl = new AV.ACL()
  acl.setWriteAccess(req.currentUser, true)
  acl.setWriteAccess(req.object.get('vacationer'), true)
  acl.setRoleReadAccess(new AV.Role('customerService'), true)
  req.object.setACL(acl)
  res.success()
})
