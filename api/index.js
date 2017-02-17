const express = require('express')
const AV = require('leanengine')

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY
})
// TODO 后续移除全局 masterKey
AV.Cloud.useMasterKey();

var app = express()

// 加载云函数定义
require('./cloud')
// 加载云引擎中间件
app.use(AV.express())

module.exports = app
