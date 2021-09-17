const passport = require('passport'),
  OAuth2Strategy = require('passport-oauth').OAuth2Strategy
const axios = require('axios').default
const AV = require('leanengine')
const randomstring = require('randomstring')
const config = require('../config')

module.exports = (router) => {
  passport.use(
    'xd-cas',
    new OAuth2Strategy(
      {
        authorizationURL: 'https://sso.security.xindong.com/cas/oauth2.0/authorize',
        tokenURL: 'https://sso.security.xindong.com/cas/oauth2.0/accessToken',
        clientID: process.env.XD_CAS_CLIENT_ID,
        clientSecret: process.env.XD_CAS_CLIENT_SECRET,
        callbackURL: `${config.host}/auth/xd-cas/callback`,
        store: true,
      },
      function (accessToken, refreshToken, profile, done) {
        axios
          .get('https://sso.security.xindong.com/cas/oauth2.0/profile', {
            params: {
              access_token: accessToken,
            },
          })
          .then(async ({ data: { userId, email, realname } }) => {
            // 先尝试匹配，如果已存在 authData 对应的用户直接登录
            try {
              const matchedUser = await AV.User.loginWithAuthData(
                { uid: userId, access_token: accessToken },
                'xd_cas',
                {
                  failOnNotExist: true,
                }
              )
              console.log('authData matched', matchedUser.id)
              return done(undefined, matchedUser)
            } catch (error) {
              const USER_NOT_FOUND = 211
              if (error.code === USER_NOT_FOUND) {
                const emailMatchedUser = await new AV.Query(AV.User)
                  .equalTo('email', email)
                  .first({ useMasterKey: true })
                if (emailMatchedUser) {
                  // fetch to get the sessionToken
                  await emailMatchedUser.fetch({ keys: 'sessionToken' }, { useMasterKey: true })
                  emailMatchedUser
                    .set('password', randomstring.generate())
                    .set('name', realname)
                    .set('authData', { xd_cas: { uid: userId, access_token: accessToken } })
                  await emailMatchedUser.save(undefined, { useMasterKey: true })
                  console.log('email matched', emailMatchedUser.id)
                  return done(undefined, emailMatchedUser)
                }
                const user = new AV.User()
                user.set('email', email).set('name', realname)
                await user.loginWithAuthData({ uid: userId, access_token: accessToken }, 'xd_cas')
                console.log('new user created', user.id)
                return done(undefined, user)
              }
              return done(error)
            }
          })
          .catch(done)
      }
    )
  )
  router.get('/auth/xd-cas', (req, ...args) =>
    passport.authenticate('xd-cas', { state: { referer: req.headers.referer } })(req, ...args)
  )
  router.get('/auth/xd-cas/callback', passport.authenticate('xd-cas'), function (req, res) {
    const state = req.authInfo.state
    // resume state...
    console.log(state)
    if (req.user) {
      res.redirect(state.referer + '?token=' + req.user.getSessionToken())
    }
  })
}
