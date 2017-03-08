import React from 'react'
import Promise from 'bluebird'
import AV from 'leancloud-storage'

const TICKET_STATUS = require('../lib/constant').TICKET_STATUS

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

exports.getTicketStatusLabel = (ticket) => {
  if (ticket.get('status') === TICKET_STATUS.FULFILLED) {
    return <span className='label label-success'>已解决</span>
  } else if (ticket.get('status') === TICKET_STATUS.REJECTED) {
    return <span className='label label-danger'>不解决</span>
  } else if (ticket.get('status') === TICKET_STATUS.PRE_FULFILLED) {
    return <span className='label label-primary'>待确认解决</span>
  } else {
    const latestReply = ticket.get('latestReply')
    if (latestReply && latestReply.isCustomerService) {
      return <span className='label label-info'>已回复</span>
    } else {
      return <span className='label label-warning'>未回复</span>
    }
  }
}

exports.getTicketStatusLabelOnlyStatus = (status) => {
  if (status === TICKET_STATUS.FULFILLED) {
    return <span className='label label-success'>已解决</span>
  } else if (status === TICKET_STATUS.REJECTED) {
    return <span className='label label-danger'>不解决</span>
  } else if (status === TICKET_STATUS.PRE_FULFILLED) {
    return <span className='label label-primary'>待确认解决</span>
  } else if (status === TICKET_STATUS.OPEN) {
    return <span className='label label-info'>打开</span>
  }
}
