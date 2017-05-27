const AV = require('leanengine')

const common = require('./common')

AV.Cloud.define('getUserInfo', (req) => {
  const {username} = req.params
  return new AV.Query(AV.User)
  .equalTo('username', username)
  .first({useMasterKey: true})
  .then((user) => {
    return common.getTinyUserInfo(user)
  })
})

