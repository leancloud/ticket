const router = require('express').Router()
const qs = require('qs')
const _ = require('lodash')
const request = require('request-promise')
const AV = require('leanengine')

const config = require('../config')
const common = require('./common')

const serverDomain = 'https://leancloud.cn'
const oauthScope = 'client:info app:info client:account'

if (!config.leancloudAppUrl) {
  console.log('leancloudAppUrl 没有配置，导致无法生成应用链接。')
}

exports.orgName = 'LeanCloud'

exports.login = (callbackUrl) => {
  return (req, res) => {
    const loginUrl = serverDomain + '/1.1/authorize?' +
      qs.stringify({
        client_id: config.oauthKey,
        response_type: 'code',
        redirect_uri: callbackUrl,
        scope: oauthScope,
      })
    res.redirect(loginUrl)
  }
}

exports.loginCallback = (callbackUrl) => {
  return (req, res) => {
    getAccessToken(req.query.code, callbackUrl).then((accessToken) => {
      accessToken.uid = '' + accessToken.uid
      return AV.User.signUpOrlogInWithAuthData(accessToken, 'leancloud')
    }).then((user) => {
      if (_.isEqual(user.createdAt, user.updatedAt)) {
        // 第一次登录，从 LeanCloud 初始化用户信息
        return initUserInfo(user)
      }
      return user
    }).then((user) => {
      res.redirect('/login?token=' + user._sessionToken)
    })
  }
}

/**
 * 判断该用户是否有权限提交工单
 */ 
exports.checkPermission = (user) => {
  if (!config.oauthKey) {
    return Promise.resolve()
  }

  return common.isCustomerService(user).then((isCustomerService) => {
    if (isCustomerService) {
      return
    }
    return getUser(user.get('username'))
    .then((user) => {
      return getAccount(user)
    })
    .then(({current_support_service}) => {
      if (!current_support_service) {
        throw new AV.Cloud.Error('您的账号不具备提交工单的条件。')
      }
    })
  })
}

AV.Cloud.define('checkPermission', (req) => {
  return exports.checkPermission(req.currentUser)
})

AV.Cloud.define('getLeancloudAccount', (req) => {
  return common.isCustomerService(req.currentUser)
  .then((isCustomerService) => {
    if (!isCustomerService) {
      throw new AV.Cloud.Error('unauthorized', {status: 401})
    }
    if (!config.oauthKey) {
      return Promise.resolve(true)
    }
    return getUser(req.params.username)
    .then((user) => {
      return getAccount(user)
    })
  })
})

AV.Cloud.define('getLeanCloudUserInfoByUsername', (req) => {
  return common.isCustomerService(req.currentUser).then((isCustomerService) => {
    if (!isCustomerService) {
      throw new AV.Cloud.Error('unauthorized', {status: 401})
    }
    return getUser(req.params.username)
    .then((user) => {
      return getClientInfo(user)
    })
  })
})

AV.Cloud.define('getLeanCloudAppsByUsername', (req) => {
  return common.isCustomerService(req.currentUser).then((isCustomerService) => {
    if (!isCustomerService) {
      throw new AV.Cloud.Error('unauthorized', {status: 401})
    }
    return getUser(req.params.username)
    .then((user) => {
      return getApps(user)
    })
  })
})

AV.Cloud.define('getLeanCloudApps', (req) => {
  const user = req.currentUser
  if (!user) {
    throw new AV.Cloud.Error('unauthorized', {status: 401})
  }
  return getApps(req.currentUser)
})

AV.Cloud.define('getLeanCloudApp', (req) => {
  const {username, appId} = req.params
  if (!req.currentUser) {
    throw new AV.Cloud.Error('unauthorized', {status: 401})
  }
  if (req.currentUser.get('username') === username) {
    return getApp(req.currentUser, appId)
  }
  
  return common.isCustomerService(req.currentUser).then((isCustomerService) => {
    if (!isCustomerService) {
      throw new AV.Cloud.Error('unauthorized', {status: 401})
    }
    return getUser(username)
    .then((user) => {
      return getApp(user, appId)
    })
  })
})

AV.Cloud.define('getLeanCloudAppUrl', (req) => {
  return common.isCustomerService(req.currentUser).then((isCustomerService) => {
    if (!isCustomerService) {
      throw new AV.Cloud.Error('unauthorized', {status: 401})
    }
    if (!config.leancloudAppUrl) {
      return null
    }
    const {appId} = req.params
    return config.leancloudAppUrl.replace(':appId', appId)
  })
})

const getUser = (username) => {
  return new AV.Query(AV.User)
  .equalTo('username', username)
  .first({useMasterKey: true})
  .then((user) => {
    if (user) {
      return user
    }
    throw new AV.Cloud.Error('Could not find user: username=' + username, {status: 404})
  })
}

const getAccessToken = (code, callbackUrl) => {
  const url = serverDomain + '/1.1/token?' +
    qs.stringify({
      grant_type: 'authorization_code',
      client_id: config.oauthKey,
      client_secret: config.oauthSecret,
      redirect_uri: callbackUrl,
      code,
    })
  return request({url, json: true})
}

const initUserInfo = (user) => {
  return getClientInfo(user)
  .then((client) => {
    return user.save({
      username: client.username,
      email: client.email,
    }, {user})
  })
}

const getClientInfo = (user) => {
  if (user.get('authData') && user.get('authData').leancloud) {
    const authData = user.get('authData').leancloud
    return requestLeanCloud(`${serverDomain}/1.1/open/clients/self`, authData)
  }
  throw new AV.Cloud.Error(`Could not find LeanCloud authData: userId=${user.id}`, {status: 404})
}

const getApps = (user) => {
  if (user.get('authData') && user.get('authData').leancloud) {
    const authData = user.get('authData').leancloud
    return requestLeanCloud(`${serverDomain}/1.1/open/clients/${authData.uid}/apps`, authData)
  }
  throw new AV.Cloud.Error(`Could not find LeanCloud authData: userId=${user.id}`, {status: 404})
}

const getApp = (user, appId) => {
  if (user.get('authData') && user.get('authData').leancloud) {
    const authData = user.get('authData').leancloud
    return requestLeanCloud(`${serverDomain}/1.1/open/clients/${authData.uid}/apps/${appId}`, authData)
  }
  throw new AV.Cloud.Error(`Could not find LeanCloud authData: userId=${user.id}`, {status: 404})
}

const getAccount = (user) => {
  if (user.get('authData') && user.get('authData').leancloud) {
    const authData = user.get('authData').leancloud
    return requestLeanCloud(`${serverDomain}/1.1/open/clients/${authData.uid}/account`, authData)
  }
  throw new AV.Cloud.Error(`Could not find LeanCloud authData: userId=${user.id}`, {status: 404})
}

const requestLeanCloud = (url, leancloudAuthData) => {
  return request({
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + leancloudAuthData.access_token
    },
    json: true,
  })
}

exports.router = router
