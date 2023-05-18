const _ = require('lodash')
const { Router } = require('express')
const cors = require('cors')

const config = require('../config')
const { parseSearchingQ } = require('./middleware')

// 加载云函数定义
require('./cloud')
require('./OpsLog')
require('./User')
require('./Organization')
require('./Role')
require('./stats')

// 加载 next shim
// TODO(sdjdd): 之后移除
require('./next-shim')

const apiRouter = Router().use(cors({ origin: config.corsOrigin }))
apiRouter.use('/files', require('./file/api'))
apiRouter.use('/triggers', require('./rule/trigger/api'))
apiRouter.use('/automations', require('./rule/automation/api'))
apiRouter.use('/ticket-fields', require('./ticketField'))
apiRouter.use('/ticket-forms', require('./ticketForm'))
apiRouter.use('/tickets', require('./ticket/api'))
apiRouter.use('/users', require('./user/api'))
apiRouter.use('/categories', require('./category/api'))
apiRouter.use('/customer-services', require('./customerService/api'))
apiRouter.get('/debug/search', parseSearchingQ, (req, res) => {
  res.json({ q: req.q, query: req.query })
})
apiRouter.use('/translate', require('./translate/api'))
apiRouter.use('/quick-replies', require('./quick-reply/api'))

const router = Router()
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
