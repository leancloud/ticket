const AV = require('leanengine')

const { getTinyUserInfo } = require('./common')
const errorHandler = require('./errorHandler')

let newApp

const isNewApp = () => {
  return new AV.Query('_User')
    .limit(1)
    .find({ useMasterKey: true })
    .then((users) => {
      if (users.length === 0) {
        console.log('新应用启动，注册的第一个用户将成为管理员。')
        return true
      } else {
        return false
      }
    })
}

setTimeout(() => {
  isNewApp()
    .then((result) => {
      newApp = result
      return
    })
    .catch((err) => {
      errorHandler.captureException(err)
    })
}, 3000)

AV.Cloud.define('getUserInfo', async (req) => {
  const username = req.params.username
  if (typeof username !== 'string') {
    throw new AV.Cloud.Error('The username must be a string', { status: 400 })
  }
  const user = await new AV.Query(AV.User)
    .equalTo('username', username)
    .first({ useMasterKey: true })
  if (!user) {
    return null
  }
  return {
    ...(await getTinyUserInfo(user)),
    tags: user.get('tags'),
    createdAt: user.createdAt,
  }
})

if (!newApp) {
  AV.Cloud.afterSave('_User', async (req) => {
    if (newApp) {
      newApp = false
      const admin = await addRole(
        'admin',
        new AV.ACL().setPublicReadAccess(true).setRoleWriteAccess('admin', true),
        req.object
      )
      const customerService = await addRole(
        'customerService',
        new AV.ACL().setPublicReadAccess(true).setRoleWriteAccess('customerService', true),
        undefined,
        admin
      )
      await addRole(
        'staff',
        new AV.ACL().setPublicReadAccess(true).setRoleWriteAccess('customerService', true),
        undefined,
        customerService
      )
    }
  })
}

const addRole = (name, acl, initUser, initSubRole) => {
  const role = new AV.Role(name, acl)
  if (initUser) {
    role.getUsers().add(initUser)
  }
  if (initSubRole) {
    role.getRoles().add(initSubRole)
  }
  return role.save()
}
