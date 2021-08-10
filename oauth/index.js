const { Router } = require('express')
const passport = require('passport')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const Redis = require('ioredis')
const config = require('../config')

const redisClient = new Redis(process.env.REDIS_URL_CACHE)

// LeanCloud OAuth
const loginCallbackPath = '/oauth/callback'
const loginCallbackUrl = config.host + loginCallbackPath
const router = Router()
router.use('/oauth/login', require('./lc').login(loginCallbackUrl))
router.use(loginCallbackPath, require('./lc').loginCallback(loginCallbackUrl))

passport.serializeUser(function (user, done) {
  // console.log('serializeUser:', user.id)
  done(null, user.id)
})
router.use(passport.initialize())
router.use(session({ secret: 'ticket', store: new RedisStore({ client: redisClient }) }))
router.use(passport.session()) // requied for state store

if (process.env.ENABLE_XD_OAUTH) {
  require('./xd-cas')(router)
}

module.exports = router
