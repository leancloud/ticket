import React from 'react'
import PropTypes from 'prop-types'
import {Link} from 'react-router'
import {Image} from 'react-bootstrap'
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
    return next()
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

exports.isCustomerService = (user, ticketAuthor) => {
  if (!user) {
    return Promise.resolve(false)
  }
  if (ticketAuthor && ticketAuthor.id === user.id) {
    // 如果是客服自己提交工单，则当前客服在该工单中认为是用户，
    // 这时为了方便工单作为内部工作协调使用。
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
  const name = props.user.name || props.user.get('name')
  return (
    <span>
      <Link to={'/users/' + username} className="avatar">
        <exports.Avatar user={props.user} />
      </Link>
      <Link to={'/users/' + username} className="username">
        {name}
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
    throw new Error('unkonwn ticket status:', props.status)
  }
}
exports.TicketStatusLabel.displayName = 'TicketStatusLabel'
exports.TicketStatusLabel.propTypes = {
  status: PropTypes.number.isRequired,
}

exports.Avatar = (props) => {
  let src = `https://cdn.v2ex.com/gravatar/${props.user.gravatarHash || props.user.get('gravatarHash')}?s=${props.height || 16}&r=pg&d=identicon`
  return <Image height={props.height || 16} width={props.width || 16} src={src} rounded />
}
exports.Avatar.displayName = 'Avatar'
exports.Avatar.propTypes = {
  user: PropTypes.object.isRequired,
  height: PropTypes.string,
  width: PropTypes.string
}
