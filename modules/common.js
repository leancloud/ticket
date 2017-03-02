import React from 'react'
import qs from 'qs'
import Promise from 'bluebird'
import AV from 'leancloud-storage'

import {TICKET_STATUS_OPEN} from '../lib/constant'

exports.userLabel = (user) => {
  return (
    <span>{user.username || user.get('username')}</span>
  )
}

exports.getTinyCategoryInfo = (category) => {
  return {
    objectId: category.id,
    name: category.get('name'),
  }
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

exports.uploadFiles = (files) => {
  return Promise.map(files, (file) => {
    return new Promise((resolve, reject) => {
      var reader = new FileReader()
      reader.onload = (function() {
        return function(e) {
          const result = e.target.result
          const macher = result.match(new RegExp('^data:([a-zA-Z0-9-/]+)?;base64,([a-zA-Z0-9+/=]+)$'))
          new AV.File(file.name, {base64: macher[2]}).save().then(resolve).catch(reject)
        }
      })()
      reader.readAsDataURL(file)
    })
  })
}
