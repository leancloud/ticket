const _ = require('lodash')
const AV = require('leanengine')

const forEachAVObject = require('../api/common').forEachAVObject

exports.up = function (next) {
  return addNameToUser()
    .then(() => {
      return addNameToOpsLog()
    })
    .then(() => {
      return addNameToTicket()
    })
    .then(() => {
      return next()
    })
    .catch(next)
}

const addNameToUser = () => {
  return forEachAVObject(
    new AV.Query('_User'),
    (user) => {
      user.set('name', user.get('username'))
      return user.save()
    },
    { useMasterKey: true }
  )
}

const addNameToOpsLog = () => {
  return forEachAVObject(
    new AV.Query('OpsLog'),
    (opsLog) => {
      _.values(opsLog.get('data')).forEach((v) => {
        if (v.username) {
          v.name = v.username
        }
      })
      opsLog.set('data', opsLog.get('data'))
      return opsLog.save()
    },
    { useMasterKey: true }
  )
}

const addNameToTicket = () => {
  return forEachAVObject(
    new AV.Query('Ticket'),
    (ticket) => {
      const latestReply = ticket.get('latestReply')
      if (latestReply) {
        latestReply.author.name = latestReply.author.username
        ticket.set('latestReply', latestReply)
      }
      const joinedCustomerServices = ticket.get('joinedCustomerServices')
      if (joinedCustomerServices && joinedCustomerServices.length > 0) {
        joinedCustomerServices.forEach((user) => {
          user.name = user.username
        })
        ticket.set('joinedCustomerServices', joinedCustomerServices)
      }
      if (ticket.dirty()) {
        return ticket.save()
      }
      return
    },
    { useMasterKey: true }
  )
}

exports.down = function (next) {
  return forEachAVObject(
    new AV.Query('_User'),
    (user) => {
      user.unset('name')
      return user.save()
    },
    { useMasterKey: true }
  )
    .then(() => {
      return forEachAVObject(
        new AV.Query('OpsLog'),
        (opsLog) => {
          _.values(opsLog.get('data')).forEach((v) => {
            if (v.name) {
              v.name = undefined
            }
          })
          opsLog.set('data', opsLog.get('data'))
          return opsLog.save()
        },
        { useMasterKey: true }
      )
    })
    .then(() => {
      return forEachAVObject(
        new AV.Query('Ticket'),
        (ticket) => {
          const latestReply = ticket.get('latestReply')
          if (latestReply) {
            latestReply.author.name = undefined
            ticket.set('latestReply', latestReply)
          }
          const joinedCustomerServices = ticket.get('joinedCustomerServices')
          if (joinedCustomerServices && joinedCustomerServices.length > 0) {
            joinedCustomerServices.forEach((user) => {
              user.name = undefined
            })
            ticket.set('joinedCustomerServices', joinedCustomerServices)
          }
          return ticket.save()
        },
        { useMasterKey: true }
      )
    })
    .then(() => {
      return next()
    })
}
