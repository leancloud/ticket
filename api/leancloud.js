const router = require('express').Router()
const qs = require('qs')
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

module.exports = router
