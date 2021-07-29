const { Router } = require('express')
const passport = require('passport')
const session = require('express-session')
const config = require('../config')

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
router.use(session({ secret: 'ticket' }))
router.use(passport.session()) // requied for state store

if (process.env.ENABLE_XD_OAUTH) {
  require('./xd-cas')(router)
}

module.exports = router
