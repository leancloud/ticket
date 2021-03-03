const Promise = require('bluebird')
const AV = require('leanengine')

const { getCategoriesTree, depthFirstSearchFind } = require('./common')
const errorHandler = require('./errorHandler')

AV.Cloud.beforeSave('Category', (req, res) => {
  if (!req.currentUser) {
    return res.error('noLogin')
  }
  getCategoryAcl()
    .then((acl) => {
      req.object.setACL(acl)
      res.success()
      return
    })
    .catch(errorHandler.captureException)
})

AV.Cloud.beforeUpdate('Category', async ({ object: category, currentUser: user }) => {
  if (category.updatedKeys.includes('deletedAt')) {
    const categoriesTree = await getCategoriesTree({ user })
    const node = depthFirstSearchFind(categoriesTree, (c) => c.id == category.id)
    const enableChild = depthFirstSearchFind(node.children, (c) => !c.get('deletedAt'))
    if (enableChild) {
      throw new AV.Cloud.Error('该分类仍有未停用的子分类，不能停用。')
    }
  }
})

AV.Cloud.beforeDelete('Category', () => {
  throw new AV.Cloud.Error('不能删除分类，如果需要，请使用「停用」功能。')
})

const getCategoryAcl = () => {
  const acl = new AV.ACL()
  acl.setPublicReadAccess(true)
  acl.setRoleWriteAccess(new AV.Role('customerService'), true)
  return Promise.resolve(acl)
}
