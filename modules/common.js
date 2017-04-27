import React from 'react'
import Promise from 'bluebird'
import { Link } from 'react-router'
import AV from 'leancloud-storage'

const TICKET_STATUS = require('../lib/constant').TICKET_STATUS

exports.userLabel = (user) => {
  const username = user.username || user.get('username')
  return (
    <span><Link to={'/users/' + username}>{username}</Link></span>
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
    return new AV.File(file.name, file).save()
  })
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

exports.TicketStatusLabel = React.createClass({
  render() {
    if (this.props.status === TICKET_STATUS.FULFILLED) {
      return <span className='label label-success'>已解决</span>
    } else if (this.props.status === TICKET_STATUS.REJECTED) {
      return <span className='label label-danger'>已关闭</span>
    } else if (this.props.status === TICKET_STATUS.PRE_FULFILLED) {
      return <span className='label label-primary'>待确认解决</span>
    } else if (this.props.status === TICKET_STATUS.NEW) {
      return <span className='label label-warning'>待处理</span>
    } else if (this.props.status === TICKET_STATUS.PENDING) {
      return <span className='label label-info'>处理中</span>
    }
  }
})

exports.TicketReplyLabel = React.createClass({
  render() {
    const status = this.props.ticket.get('status')
    if (status === TICKET_STATUS.PENDING) {
      const latestReply = this.props.ticket.get('latestReply')
      if (latestReply && latestReply.isCustomerService) {
        return <span className='label label-info'>已回复</span>
      } else {
        return <span className='label label-warning'>未回复</span>
      }
    } else {
      return <span></span>
    }
  }
})
