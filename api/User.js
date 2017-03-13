const AV = require('leanengine')

const common = require('./common')
const leancloud = require('./leancloud')

AV.Cloud.define('getUserInfo', (req, res) => {
  new AV.Query(AV.User)
  .equalTo('username', req.params.username)
  .first({useMasterKey: true})
  .then((user) => {
    if (!user) {
      return res.error('notFound')
    }
    common.getTinyUserInfo(user).then(res.success)
  })
})

AV.Cloud.define('getLeanCloudUserInfo', (req, res) => {
  common.isCustomerService(req.currentUser).then((isCustomerService) => {
    if (!isCustomerService) {
      return res.error('unauthorized')
    }
    return new AV.Query(AV.User)
    .equalTo('username', req.params.username)
    .first({useMasterKey: true})
    .then((user) => {
      return leancloud.getClientInfo(user.get('authData').leancloud)
    }).then((user) => {
      res.success(user)
    })
  })
})

AV.Cloud.define('getLeanCloudApps', (req, res) => {
  common.isCustomerService(req.currentUser).then((isCustomerService) => {
    if (!isCustomerService) {
      return res.error('unauthorized')
    }
    new AV.Query(AV.User)
    .equalTo('username', req.params.username)
    .first({useMasterKey: true})
    .then((user) => {
      return leancloud.getApps(user.get('authData').leancloud)
    }).then((apps) => {
      res.success(apps)
    })
  })
})
