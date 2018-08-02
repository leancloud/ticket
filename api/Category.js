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
    return
  }).catch(errorHandler.captureException)
})

AV.Cloud.beforeDelete('Category', async (req) => {
  const category = req.object
  const user = await new AV.Query('_User')
    .equalTo('categories.objectId', category.id)
    .first({user: req.currentUser})
  if (user) {
    throw new AV.Cloud.Error('仍有人负责该分类，不能删除。')
  }

  const ticket = await new AV.Query('Ticket')
    .equalTo('category.objectId', category.id)
    .first({user: req.currentUser})
  if (ticket) {
    throw new AV.Cloud.Error('仍有工单属于该分类，不能删除。')
  }

  const categoryChild = await new AV.Query('Category')
    .equalTo('parent', AV.Object.createWithoutData('Category', category.id))
    .first({user: req.currentUser})
  if (categoryChild) {
    throw new AV.Cloud.Error('仍有子分类属于该分类，不能删除。')
  }
})

const getCategoryAcl = () => {
  const acl = new AV.ACL()
  acl.setPublicReadAccess(true)
  acl.setRoleWriteAccess(new AV.Role('customerService'), true)
  return Promise.resolve(acl)
}
