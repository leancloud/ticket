const AV = require('leanengine')

const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('Category', (req, res) => {
  if (!req.currentUser._sessionToken) {
    return res.error('noLogin')
  }
  getCategoryAcl().then((acl) => {
    req.object.setACL(acl)
    res.success()
  }).catch(errorHandler.captureException)
})

const getCategoryAcl = () => {
  const acl = new AV.ACL()
  acl.setPublicReadAccess(true)
  acl.setRoleWriteAccess(new AV.Role('customerService'), true)
  return Promise.resolve(acl)
}
