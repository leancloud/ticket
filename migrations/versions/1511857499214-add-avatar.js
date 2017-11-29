const AV = require('leanengine')

const {getGravatarHash} = require('../../lib/common')
const forEachAVObject = require('../../api/common').forEachAVObject

exports.up = function(next) {
  return forEachAVObject(new AV.Query('_User'), (user) => {
    return user.set('gravatarHash', getGravatarHash(user.get('email')))
    .save()
  })
  .then(() => {
    return next()
  })
}

exports.down = function(next) {
  return forEachAVObject(new AV.Query('_User'), (user) => {
    return user.unset('gravatarHash')
    .save()
  })
  .then(() => {
    return next()
  })
}
