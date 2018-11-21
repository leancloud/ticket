const AV = require('leanengine')

AV.Cloud.define('getRoleUsers', ({params, currentUser}) => {
  const {roleId} = params
  return AV.Object.createWithoutData('_Role', roleId)
  .fetch({}, {user: currentUser})
  .then(organization => {
    if (!organization) {
      throw new AV.Cloud.Error('该组织不存在。')
    }
    
    return organization.getUsers().query().find({useMasterKey: true})
  })
})
