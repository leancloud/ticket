import React from 'react'
import AV from 'leancloud-storage'

exports.userLabel = (user) => {
  return (
    <span>{user.username || user.get('username')}</span>
  )
}

exports.requireAuth = (nextState, replace) => {
  if (!AV.User.current()) {
    replace({
      pathname: '/login',
      state: { nextPathname: nextState.location.pathname }
    })
  }
}

exports.requireCustomerServiceAuth = (nextState, replace, next) => {
  new AV.Query(AV.Role)
    .equalTo('name', 'customerService')
    .equalTo('users', AV.User.current())
    .first()
    .then((role) => {
      if (!role) {
        replace({
          pathname: '/error',
          state: { code: 'requireCustomerServiceAuth' }
        })
      }
      next()
    }).catch((err) => {
      replace({
        pathname: '/error',
        state: { code: 'orz', err }
      })
      next()
    })
}
