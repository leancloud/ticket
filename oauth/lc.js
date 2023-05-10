const format = require('util').format
const router = require('express').Router()
const qs = require('query-string')
const _ = require('lodash')
const Promise = require('bluebird')
const request = require('request-promise')
const randomstring = require('randomstring')
const AV = require('leanengine')

const config = require('../config')
const { isStaff } = require('../api/common')
const {
  getGravatarHash,
  defaultLeanCloudRegion,
  getLeanCloudRegions,
  getLeanCloudServerDomain,
  getLeanCloudPlatform,
} = require('../lib/common')

const oauthScope = 'client:info app:info client:account'

exports.orgName = 'LeanCloud'

exports.login = (callbackUrl) => {
  return (req, res, next) => {
    const region = req.body.region || defaultLeanCloudRegion
    return createState({
      region,
      sessionToken: req.body.sessionToken,
      referer: req.headers.referer,
    })
      .then((state) => {
        const loginUrl =
          getLeanCloudServerDomain(region) +
          '/client-center/2/oauth2/authorize?' +
          qs.stringify({
            client_id: config.oauthKey,
            response_type: 'code',
            redirect_uri: callbackUrl,
            scope: oauthScope,
            state,
          })
        return res.redirect(loginUrl)
      })
      .catch(next)
  }
}

exports.loginCallback = (callbackUrl) => {
  return (req, res, next) => {
    return getStateData(req.query.state)
      .then(({ region, sessionToken, referer }) => {
        return getAccessToken(region, req.query.code, callbackUrl).then((accessToken) => {
          accessToken.uid = '' + accessToken.uid
          if (!sessionToken) {
            return AV.User.loginWithAuthData(accessToken, getLeanCloudPlatform(region), {
              useMasterKey: true,
            })
              .then((user) => {
                if (!user.get('gravatarHash')) {
                  // 第一次登录，从 LeanCloud 初始化用户信息
                  // 如果用户是预创建的，首次登录时 created 与 updatedAt 并不相同，这里简单用有没有 gravatarHash 判断
                  return initUserInfo(region, user)
                }
                return user
              })
              .then((user) => {
                return res.redirect(referer + '?token=' + user._sessionToken)
              })
          } else {
            return AV.User.become(sessionToken)
              .then((user) => {
                return user.save(
                  { [`authData.${getLeanCloudPlatform(region)}`]: accessToken },
                  { user }
                )
              })
              .then(() => {
                return res.redirect(referer)
              })
          }
        })
      })
      .catch(next)
  }
}

const createState = (data) => {
  return new AV.Object('State')
    .save({
      state: randomstring.generate(),
      data,
      ACL: new AV.ACL(),
    })
    .then((state) => {
      return state.get('state')
    })
}

const getStateData = (state) => {
  return new AV.Query('State')
    .equalTo('state', state)
    .first({ useMasterKey: true })
    .then((obj) => {
      if (!obj) {
        throw new AV.Cloud.Error('state is invalid.')
      }
      obj.destroy({ useMasterKey: true })
      return obj.get('data')
    })
}

/**
 * 判断该用户是否有权限提交工单
 */
exports.checkPermission = async (user) => {
  if (!config.enableLeanCloudIntegration || (await isStaff(user))) {
    return true
  }
  const userObj = await getUser(user.get('username'))
  const accounts = await getAccounts(userObj)
  return !!accounts.find((account) => account.current_support_service)
}

AV.Cloud.define('checkPermission', async (req) => {
  if (!req.currentUser || !(await exports.checkPermission(req.currentUser))) {
    throw new AV.Cloud.Error('您的账号不具备提交工单的条件。')
  }
})

if (config.enableLeanCloudIntegration) {
  AV.Cloud.define('getLeanCloudUserInfos', (req) => {
    const user = req.currentUser
    if (!user) {
      throw new AV.Cloud.Error('unauthorized', { status: 401 })
    }
    return getClientInfos(user)
  })

  AV.Cloud.define('getLeanCloudUserInfosByUsername', (req) => {
    return isStaff(req.currentUser).then((isStaff) => {
      if (!isStaff) {
        throw new AV.Cloud.Error('unauthorized', { status: 401 })
      }
      return getUser(req.params.username).then((user) => {
        return getClientInfos(user)
      })
    })
  })

  AV.Cloud.define('getLeanCloudAppsByUsername', (req) => {
    return isStaff(req.currentUser).then((isStaff) => {
      if (!isStaff) {
        throw new AV.Cloud.Error('unauthorized', { status: 401 })
      }
      return getUser(req.params.username).then((user) => {
        return getApps(user)
      })
    })
  })

  AV.Cloud.define('getLeanCloudApps', (req) => {
    const user = req.currentUser
    if (!user) {
      throw new AV.Cloud.Error('unauthorized', { status: 401 })
    }
    return getApps(req.currentUser)
  })

  AV.Cloud.define('getLeanCloudApp', (req) => {
    const { username, appId } = req.params
    if (!req.currentUser) {
      throw new AV.Cloud.Error('unauthorized', { status: 401 })
    }
    if (req.currentUser.get('username') === username) {
      return getApp(req.currentUser, appId)
    }

    return isStaff(req.currentUser).then((isStaff) => {
      if (!isStaff) {
        throw new AV.Cloud.Error('unauthorized', { status: 401 })
      }
      return getUser(username).then((user) => {
        return getApp(user, appId)
      })
    })
  })

  AV.Cloud.define('getLeanCloudAppUrl', (req) => {
    return isStaff(req.currentUser).then((isStaff) => {
      if (!isStaff) {
        throw new AV.Cloud.Error('Unauthorized', { status: 401 })
      }
      const { region, appId } = req.params
      if (config.leancloudAppUrl) {
        return format(config.leancloudAppUrl, region, appId)
      }
      return null
    })
  })
}

const getUser = (username) => {
  return new AV.Query(AV.User)
    .equalTo('username', username)
    .first({ useMasterKey: true })
    .then((user) => {
      if (user) {
        return user
      }
      throw new AV.Cloud.Error('Could not find user: username=' + username, { status: 404 })
    })
}

const getAccessToken = (region, code, callbackUrl) => {
  const url =
    getLeanCloudServerDomain(region) +
    '/client-center/2/oauth2/token?' +
    qs.stringify({
      grant_type: 'authorization_code',
      client_id: config.oauthKey,
      client_secret: config.oauthSecret,
      redirect_uri: callbackUrl,
      code,
    })
  return request({ url, json: true })
}

const initUserInfo = (region, user) => {
  return getClientInfo(region, user).then((client) => {
    return user.save(
      {
        username: client.username,
        name: client.username,
        email: client.email,
        gravatarHash: getGravatarHash(client.email),
      },
      { user }
    )
  })
}

const getClientInfos = (user) => {
  return mapAuthDatas(user, (region, authData) => {
    return requestLeanCloud(
      `${getLeanCloudServerDomain(region)}/client-center/2/oauth2/open/clients/self`,
      authData
    ).then((obj) => {
      obj.region = region
      return obj
    })
  })
}

const getClientInfo = (region, user) => {
  return mapAuthDatas(user, (r, authData) => {
    if (region === r) {
      return requestLeanCloud(
        `${getLeanCloudServerDomain(region)}/client-center/2/oauth2/open/clients/self`,
        authData
      ).then((obj) => {
        obj.region = region
        return obj
      })
    }
  }).then((objs) => {
    for (let index in objs) {
      if (objs[index]) {
        return objs[index]
      }
    }
    return
  })
}

const getApps = (user) => {
  return mapAuthDatas(user, (region, authData) => {
    return requestLeanCloud(
      `${getLeanCloudServerDomain(region)}/client-center/2/oauth2/open/clients/${
        authData.uid
      }/apps`,
      authData
    ).then((objs) => {
      objs.forEach((obj) => {
        obj.region = region
      })
      return objs
    })
  }).then(_.flatten)
}

const getApp = (user, appId) => {
  return mapAuthDatas(user, (region, authData) => {
    return requestLeanCloud(
      `${getLeanCloudServerDomain(region)}/client-center/2/oauth2/open/clients/${
        authData.uid
      }/apps/${appId}`,
      authData
    )
      .then((obj) => {
        obj.region = region
        return obj
      })
      .catch((err) => {
        if (err.statusCode === 404) {
          return null
        }
        throw err
      })
  }).then((objs) => {
    for (let index in objs) {
      if (objs[index]) {
        return objs[index]
      }
    }
    return
  })
}

const getAccounts = (user) => {
  return mapAuthDatas(user, (region, authData) => {
    return requestLeanCloud(
      `${getLeanCloudServerDomain(region)}/client-center/2/oauth2/open/clients/${
        authData.uid
      }/account`,
      authData
    ).then((obj) => {
      obj.region = region
      return obj
    })
  })
}

const mapAuthDatas = (user, fn) => {
  return user.fetch({}, { useMasterKey: true }).then((user) => {
    const authData = user.get('authData')
    if (!authData) {
      throw new AV.Cloud.Error(`Could not find LeanCloud authData: userId=${user.id}`, {
        status: 404,
      })
    }
    return Promise.map(getLeanCloudRegions(), (region) => {
      const platform = getLeanCloudPlatform(region)
      if (!authData[platform]) {
        return
      }
      return fn(region, authData[platform])
    }).then(_.compact)
  })
}

const requestLeanCloud = (url, leancloudAuthData) => {
  return request({
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + leancloudAuthData.access_token,
    },
    json: true,
  })
}

exports.router = router
