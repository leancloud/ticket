import React from 'react'
import crypto from 'crypto'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import _ from 'lodash'
import AV from 'leancloud-storage/live-query'

const {TICKET_STATUS, TICKET_STATUS_MSG} = require('../lib/common')

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
  exports.isCustomerService(AV.User.current())
  .then((isCustomerService) => {
    if (!isCustomerService) {
      replace({
        pathname: '/error',
        state: { code: 'requireCustomerServiceAuth' }
      })
    }
    next()
  })
  .catch((err) => {
    replace({
      pathname: '/error',
      state: { code: err.code, err }
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
        .ascending('username')
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
  return Promise.all(_.map(files, file => new AV.File(file.name, file).save()))
}

exports.getTicketAndRelation = (nid) => {
  return new AV.Query('Ticket')
  .equalTo('nid', parseInt(nid))
  .include('author')
  .include('files')
  .first()
  .then((ticket) => {
    if (!ticket) {
      return
    }
    return Promise.all([
      new AV.Query('Reply')
        .equalTo('ticket', ticket)
        .include('author')
        .include('files')
        .ascending('createdAt')
        .find(),
      new AV.Query('OpsLog')
        .equalTo('ticket', ticket)
        .ascending('createdAt')
        .find(),
    ]).spread((replies, opsLogs) => {
      return {ticket, replies, opsLogs}
    })
  })
}

exports.UserLabel = (props) => {
  if (!props.user) {
    return (
      <span>data err</span>
    )
  }
  const username = props.user.username || props.user.get('username')
  let gravatarHash = props.user.gravatarHash
  if (!gravatarHash) {
    gravatarHash = crypto.createHash('md5').update((props.user.get('email') || '').trim().toLocaleLowerCase()).digest('hex')
  }
  return (
    <span>
      <Link to={'/users/' + username} className="avatar">
        <img height="16" width="16" src={'https://cdn.v2ex.com/gravatar/' + gravatarHash + '?s=64&r=pg&d=identicon'} />
      </Link>
      <Link to={'/users/' + username} className="username">
        {username}
      </Link>
    </span>
  )
}

exports.UserLabel.displayName = 'UserLabel'
exports.UserLabel.propTypes = {
  user: PropTypes.object,
}

exports.TicketStatusLabel = (props) => {
  switch (props.status) {
  case TICKET_STATUS.FULFILLED:
    return <span className='label label-success'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.REJECTED:
    return <span className='label label-default'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.PRE_FULFILLED:
    return <span className='label label-primary'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.NEW:
    return <span className='label label-danger'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.WAITING_CUSTOMER_SERVICE:
    return <span className='label label-warning'>{TICKET_STATUS_MSG[props.status]}</span>
  case TICKET_STATUS.WAITING_CUSTOMER:
    return <span className='label label-primary'>{TICKET_STATUS_MSG[props.status]}</span>
  default:
    new Error('unkonwn ticket status:', props.status)
  }
}
exports.TicketStatusLabel.displayName = 'TicketStatusLabel'
exports.TicketStatusLabel.propTypes = {
  status: PropTypes.number.isRequired,
}
