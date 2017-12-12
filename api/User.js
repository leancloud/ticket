const AV = require('leanengine')

const common = require('./common')
const errorHandler = require('./errorHandler')

let newApp

const isNewApp = () => {
  return new AV.Query('_User')
  .limit(1)
  .find({useMasterKey: true})
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

AV.Cloud.define('getUserInfo', (req) => {
  const {username} = req.params
  return new AV.Query(AV.User)
  .equalTo('username', username)
  .first({useMasterKey: true})
  .then((user) => {
    return common.getTinyUserInfo(user)
  })
})

AV.Cloud.afterSave('_User', (req) => {
  if (newApp) {
    newApp = false
    return Promise.all([
      addRole('admin', req.object),
      addRole('customerService', req.object)
    ])
  }
})

const addRole = (name, initUser) => {
  const roleAcl = new AV.ACL()
  roleAcl.setPublicReadAccess(true)
  roleAcl.setRoleWriteAccess(name, true)
  const role = new AV.Role(name, roleAcl)
  role.getUsers().add(initUser)
  return role.save()
}

