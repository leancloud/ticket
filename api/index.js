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
require('./Tag')
require('./stats')
require('./Vacation')

router.use('/api/leancloud', require('./leancloud').router)
router.use('/webhooks/mailgun', require('./mailgun'))

if (config.wechatCorpID
    && config.wechatSecret
    && config.wechatAgentId
    && config.wechatToken
    && config.wechatEncodingAESKey) {
  router.use('/webhooks/wechat', require('./wechat').router)
} else {
  console.log('微信相关信息没有配置，所以微信账号绑定和微信通知功能无法使用。')
}

module.exports = router
