const router = require('express').Router()
const AV = require('leanengine')

const config = require('../config')

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
})
AV.setProduction(process.env.NODE_ENV === 'production')


// 加载云函数定义
require('./cloud')
require('./Ticket')
require('./Reply')
require('./OpsLog')
require('./User')
require('./Category')
require('./Organization')
require('./Role')
require('./stats')
require('./Vacation')

const loginCallbackPath = '/oauth/callback'
const loginCallbackUrl = config.host + loginCallbackPath
router.use('/oauth/login', require('./oauth').login(loginCallbackUrl))
router.use(loginCallbackPath, require('./oauth').loginCallback(loginCallbackUrl))

router.use('/webhooks/mailgun', require('./mailgun'))
router.use('/webhooks/wechat', require('./wechat').router)

module.exports = router
