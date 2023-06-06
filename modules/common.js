import _ from 'lodash'
import i18next from 'i18next'
import mem from 'p-memoize'
import { auth, db, storage } from '../lib/leancloud'
import { depthFirstSearchFind, makeTree } from '../lib/common'

export * from '../lib/common'

export const getCategoryPathName = (category, categoriesTree) => {
  const c = depthFirstSearchFind(categoriesTree, (c) => c.id == (category.id || category.objectId))
  return getNodePath(c)
    .map((c) => getCategoryName(c))
    .join(' / ')
}

export const getCustomerServices = () => {
  return auth
    .queryRole()
    .where('name', '==', 'customerService')
    .first()
    .then((role) => role.queryUser().orderBy('username').find())
}

export const getRoles = mem(
  (user) => {
    if (!user) {
      return Promise.resolve([])
    }
    return auth
      .queryRole()
      .where('name', 'in', ['customerService', 'staff', 'admin', 'collaborator'])
      .where('users', '==', user)
      .find()
      .then((roles) => roles.map((role) => role.name))
  },
  { maxAge: 10_000 }
)

export const isAdmin = (roles) => roles.includes('admin')

export const isCustomerService = (roles) => isAdmin(roles) || roles.includes('customerService')

export const isStaff = (roles) => isCustomerService(roles) || roles.includes('staff')

export const isCollaborator = (roles) => roles.includes('collaborator')

/**
 * @param {Array<File>} files
 */
export const uploadFiles = (files) => {
  return Promise.all(_.map(files, (file) => storage.upload(file.name, file)))
}

export const fetchUsers = (userIds) => {
  return Promise.all(
    _.map(_.chunk(userIds, 50), (userIds) => {
      return auth.queryUser().where('objectId', 'in', userIds).find()
    })
  ).then(_.flatten)
}

export const getCategoriesTree = (hiddenDisable = true) => {
  const query = db.class('Category').where({
    deletedAt: hiddenDisable ? db.cmd.notExists() : undefined,
  })
  return query
    .orderBy('createdAt', 'desc')
    .limit(1000)
    .find()
    .then((categories) => {
      return makeTree(categories)
    })
    .catch((err) => {
      // 如果还没有被停用的分类，deletedAt 属性可能不存在
      if (err.code == 700 && err.message.includes('deletedAt')) {
        return getCategoriesTree(false)
      }
      throw err
    })
}

const getNodeDepth = (obj) => {
  if (!obj.parent) {
    return 0
  }
  return 1 + getNodeDepth(obj.parent)
}

export const getNodePath = (obj) => {
  if (!obj.parent) {
    return [obj]
  }
  const result = getNodePath(obj.parent)
  result.push(obj)
  return result
}

export const getNodeIndentString = (treeNode) => {
  const depth = getNodeDepth(treeNode)
  return depth == 0 ? '' : '　'.repeat(depth) + '└ '
}

export const getCategoryName = (category) => {
  return category.data.name + (category.data.deletedAt ? i18next.t('disabled') : '')
}

export const isCN = () => {
  return window.location.hostname.endsWith('.cn')
}
