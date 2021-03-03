const AV = require('leanengine')

const { getGravatarHash } = require('../lib/common')
const forEachAVObject = require('../api/common').forEachAVObject

exports.up = function (next) {
  return forEachAVObject(new AV.Query('_User'), (user) => {
    return user
      .set('gravatarHash', getGravatarHash(user.get('email')))
      .save(null, { useMasterKey: true })
  })
    .then(() => {
      return next()
    })
    .catch(next)
}

exports.down = function (next) {
  return forEachAVObject(new AV.Query('_User'), (user) => {
    return user.unset('gravatarHash').save(null, { useMasterKey: true })
  })
    .then(() => {
      return next()
    })
    .catch(next)
}
