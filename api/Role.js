const AV = require('leanengine')

const getRoleUsersQuery = ({ params, currentUser }) => {
  const { roleId } = params
  return AV.Object.createWithoutData('_Role', roleId)
    .fetch({}, { user: currentUser })
    .then((organization) => {
      if (!organization) {
        throw new AV.Cloud.Error('该角色不存在。')
      }

      return organization.getUsers().query()
    })
}

AV.Cloud.define('getRoleUsers', async (req) =>
  (await getRoleUsersQuery(req)).find({ useMasterKey: true })
)

AV.Cloud.define('getRoleUsersCount', async (req) =>
  (await getRoleUsersQuery(req)).count({ useMasterKey: true })
)
