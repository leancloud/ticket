import React from 'react'
import qs from 'qs'
import AV from 'leancloud-storage'

import {TICKET_STATUS_OPEN} from '../lib/constant'

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

exports.getCustomerServices = () => {
  return new AV.Query(AV.Role)
    .equalTo('name', 'customerService')
    .first()
    .then((role) => {
      return role.getUsers()
        .query()
        .find()
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
