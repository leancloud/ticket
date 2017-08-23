const Promise = require('bluebird')
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

AV.Cloud.beforeDelete('Category', (req) => {
  const category = req.object
  return new AV.Query('_User')
  .equalTo('categories.objectId', category.id)
  .limit(1000)
  .find({user: req.currentUser})
  .then((users) => {
    if (users.length > 0) {
      throw new AV.Cloud.Error('仍有人负责该分类，不能删除。')
    }
  })
})

const getCategoryAcl = () => {
  const acl = new AV.ACL()
  acl.setPublicReadAccess(true)
  acl.setRoleWriteAccess(new AV.Role('customerService'), true)
  return Promise.resolve(acl)
}
