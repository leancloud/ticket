const _ = require('lodash')
const { Router } = require('express')
const AV = require('leanengine')
const cors = require('cors')

const config = require('../config')
const { parseSearchingQ } = require('./middleware')

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
const router = Router()
router.use('/oauth/login', require('./oauth').login(loginCallbackUrl))
router.use(loginCallbackPath, require('./oauth').loginCallback(loginCallbackUrl))

const apiRouter = Router().use(cors({ origin: config.corsOrigin }))
apiRouter.use('/files', require('./file/api'))
apiRouter.use('/dynamic-contents', require('./DynamicContent'))
apiRouter.use('/triggers', require('./rule/trigger/api'))
apiRouter.use('/automations', require('./rule/automation/api'))
apiRouter.use('/ticket-fields', require('./TicketField'))
apiRouter.use('/tickets', require('./ticket/api'))
apiRouter.use('/users', require('./user/api'))
apiRouter.use('/categories', require('./category/api'))
apiRouter.use('/customer-services', require('./customerService/api'))
apiRouter.get('/debug/search', parseSearchingQ, (req, res) => {
  res.json({ q: req.q, query: req.query })
})
apiRouter.use('/translate', require('./translate/api'))
router.use('/api/1', apiRouter)

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
