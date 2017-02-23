const AV = require('leanengine')

exports.getTinyUserInfo = (user) => {
  if (user.get('username')) {
    return Promise.resolve({
      objectId: user.id,
      username: user.get('username'),
    })
  }
  return user.fetch().then((user) => {
    return {
      objectId: user.id,
      username: user.get('username'),
    }
  })
}

exports.getTinyReplyInfo = (reply) => {
  return exports.getTinyUserInfo(reply.get('author'))
    .then((author) => {
      return {
        author,
        content: reply.get('content'),
        isCustomerService: reply.get('isCustomerService'),
        createdAt: reply.get('createdAt'),
        updatedAt: reply.get('updatedAt'),
      }
    })
}

exports.isCustomerService = (user) => {
  if (!user) {
    return Promise.resolve(false)
  }
  return new AV.Query(AV.Role)
    .equalTo('name', 'customerService')
    .equalTo('users', user)
    .first()
    .then((role) => {
      return !!role
    })
}
