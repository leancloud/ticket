const router = require('express').Router()
const qs = require('qs')
const _ = require('lodash')
const request = require('request-promise')
const AV = require('leanengine')

const config = require('../config')

const serverDomain = 'https://leancloud.cn'
const callbackUrl = config.host + '/api/leancloud/callback'
const oauthScope = 'client:info app:info client:account'

router.get('/login', (req, res) => {
  const loginUrl = serverDomain + '/1.1/authorize?' +
    qs.stringify({
      client_id: config.leancloudOauthKey,
      response_type: 'code',
      redirect_uri: callbackUrl,
      scope: oauthScope,
    })
  res.redirect(loginUrl)
})

router.get('/callback', (req, res) => {
  getAccessToken(req.query.code).then((accessToken) => {
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
})

const getAccessToken = (code) => {
  const url = serverDomain + '/1.1/token?' +
    qs.stringify({
      grant_type: 'authorization_code',
      client_id: config.leancloudOauthKey,
      client_secret: config.leancloudOauthSecret,
      redirect_uri: callbackUrl,
      code,
    })
  return request({url, json: true})
}

const initUserInfo = (user) => {
  return exports.getClientInfo(user.get('authData').leancloud)
  .then((client) => {
    return user.save({
      username: client.username,
      email: client.email,
    })
  })
}

exports.getClientInfo = (leancloudAuthData) => {
  const url = serverDomain + '/1.1/open/clients/self'
  return request({
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + leancloudAuthData.access_token
    },
    json: true,
  })
}

exports.getApps = (leancloudAuthData) => {
  const url = `${serverDomain}/1.1/open/clients/${leancloudAuthData.uid}/apps`
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
