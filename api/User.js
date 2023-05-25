const AV = require('leanengine')

const { getTinyUserInfo } = require('./common')
const { addTask } = require('./launch')

/**
 * @param {AV.Object} adminUser
 */
async function initialize(adminUser) {
  const admin = await addRole('admin', getRoleACL('admin'), adminUser)
  const customerService = await addRole(
    'customerService',
    getRoleACL('customerService'),
    adminUser,
    admin
  )
  await addRole('staff', getRoleACL('customerService'), undefined, customerService)
}

async function defineUserHook() {
  let initializing = false
  let initialized = false
  AV.Cloud.afterSave('_User', async (req) => {
    if (initializing || initialized) {
      return
    }
    initializing = true
    try {
      await initialize(req.object)
      initialized = true
    } finally {
      initializing = false
    }
  })
}

async function isNewApp() {
  const query = new AV.Query('_User').limit(1)
  const users = await query.find({ useMasterKey: true })
  return users.length === 0
}

addTask(
  (async () => {
    if (await isNewApp()) {
      console.log('新应用启动，注册的第一个用户将成为管理员。')
      defineUserHook()
    }
  })()
)

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

// 通过 email / username 查询用户 ID
AV.Cloud.define('getUserId', async (req) => {
  const identity = req.params.identity
  let user = await new AV.Query(AV.User).equalTo('email', identity).first({ useMasterKey: true })
  if (!user) {
    user = await new AV.Query(AV.User).equalTo('username', identity).first({ useMasterKey: true })
  }
  return user ? user.id : null
})

const getRoleACL = (writableRole) => {
  const acl = new AV.ACL()
  acl.setPublicReadAccess(true)
  acl.setRoleWriteAccess(writableRole, true)
  return acl
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
