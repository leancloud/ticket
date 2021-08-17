const { Router } = require('express')
const passport = require('passport')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const Redis = require('ioredis')
const config = require('../config')

let sessionStore = undefined // will use the builtin memory store bu default
if (process.env.REDIS_URL_CACHE) {
  const redisClient = new Redis(process.env.REDIS_URL_CACHE)
  sessionStore = new RedisStore({ client: redisClient })
} else {
  console.warn(
    'Running at local mode as the sessoin cache redis was not found. To enable the cluster mode, set the REDIS_URL_CACHE.'
  )
}

// LeanCloud OAuth
const loginCallbackPath = '/oauth/callback'
const loginCallbackUrl = config.host + loginCallbackPath
const router = Router()
router.use('/oauth/login', require('./lc').login(loginCallbackUrl))
router.use(loginCallbackPath, require('./lc').loginCallback(loginCallbackUrl))

passport.serializeUser(function (user, done) {
  done(null, user.id)
})
router.use(passport.initialize())
router.use(session({ secret: process.env.LEANCLOUD_APP_MASTER_KEY, store: sessionStore }))
router.use(passport.session()) // requied for state store

if (process.env.ENABLE_XD_OAUTH) {
  require('./xd-cas')(router)
}

module.exports = router
