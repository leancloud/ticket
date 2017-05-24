const AV = require('leanengine')

const common = require('./common')

AV.Cloud.define('getUserInfo', (req, res) => {
  return new AV.Query(AV.User)
  .equalTo('username', req.params.username)
  .first()
  .then((user) => {
    if (!user) {
      return res.error('notFound')
    }
    common.getTinyUserInfo(user).then(res.success)
  })
})

