const _ = require('lodash')
const router = require('express').Router()
const AV = require('leanengine')
const config = require('../config')

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
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
require('./FAQ')

const loginCallbackPath = '/oauth/callback'
const loginCallbackUrl = config.host + loginCallbackPath
router.use('/oauth/login', require('./oauth').login(loginCallbackUrl))
router.use(loginCallbackPath, require('./oauth').loginCallback(loginCallbackUrl))

router.use('/files', require('./file'))

const { integrations } = require('../config')
console.log(`Using plugins: ${integrations.map((integration) => integration.name).join(', ')}`)

integrations.forEach(({ setup, name }) => {
  Promise.resolve(setup?.()).catch((error) => {
    console.error(`Failed to setup plugin [${name}]: ${error.message}`)
  })
})

const integrationRouters = integrations
  .map((integration) => integration.routers)
  .filter(_.identity)
  .flat()
integrationRouters.forEach((params) => router.use(...params))

module.exports = router
