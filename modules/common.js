import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import _ from 'lodash'
import AV from 'leancloud-storage'

const TICKET_STATUS = require('../lib/constant').TICKET_STATUS

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

exports.sortTickets = (tickets) => {
  return _.sortBy(tickets, (ticket) => {
    switch (ticket.get('status')) {
    case TICKET_STATUS.NEW:
      return 0
    case TICKET_STATUS.PENDING:
      return 1
    case TICKET_STATUS.PRE_FULFILLED:
      return 2
    case TICKET_STATUS.FULFILLED:
    case TICKET_STATUS.REJECTED:
      return 3
    default:
      new Error('unkonwn ticket status:', ticket.get('status'))
    }
  })
}

exports.UserLabel = (props) => {
  if (!props.user) {
    return (
      <span>data err</span>
    )
  }
  const username = props.user.username || props.user.get('username')
  return (
    <span><Link to={'/users/' + username}>{username}</Link></span>
  )
}

exports.UserLabel.displayName = 'UserLabel'
exports.UserLabel.propTypes = {
  user: PropTypes.object,
}

exports.TicketStatusLabel = (props) => {
  if (props.status === TICKET_STATUS.FULFILLED) {
    return <span className='label label-success'>已解决</span>
  } else if (props.status === TICKET_STATUS.REJECTED) {
    return <span className='label label-danger'>已关闭</span>
  } else if (props.status === TICKET_STATUS.PRE_FULFILLED) {
    return <span className='label label-primary'>待确认解决</span>
  } else if (props.status === TICKET_STATUS.NEW) {
    return <span className='label label-warning'>待处理</span>
  } else if (props.status === TICKET_STATUS.PENDING) {
    return <span className='label label-info'>处理中</span>
  }
}
exports.TicketStatusLabel.displayName = 'TicketStatusLabel'
exports.TicketStatusLabel.propTypes = {
  status: PropTypes.number.isRequired,
}

exports.TicketReplyLabel = (props) => {
  const status = props.ticket.get('status')
  if (status === TICKET_STATUS.PENDING) {
    const latestReply = props.ticket.get('latestReply')
    if (latestReply && latestReply.isCustomerService) {
      return <span className='label label-info'>已回复</span>
    } else {
      return <span className='label label-warning'>未回复</span>
    }
  } else {
    return <span></span>
  }
}
exports.TicketReplyLabel.displayName = 'TicketReplyLabel'
exports.TicketReplyLabel.propTypes = {
  ticket: PropTypes.instanceOf(AV.Object),
}

