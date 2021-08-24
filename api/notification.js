const _ = require('lodash')
const Promise = require('bluebird')
const AV = require('leanengine')

const { TICKET_STATUS } = require('../lib/common')
const errorHandler = require('./errorHandler')
const captureException = (err) => errorHandler.captureException(err)

const { integrations, getConfigValue } = require('../config')

const Notification = AV.Object.extend('notification')
const getNotification = (ticket, user) =>
  new AV.Query(Notification)
    .equalTo('user', user)
    .equalTo('ticket', ticket)
    .first({ useMasterKey: true })
    .then(
      (matchedNotification) =>
        matchedNotification ||
        new Notification({
          ticket,
          user,
          ACL: {
            [user.id]: { write: true, read: true },
          },
        })
    )

const channels = integrations
  .map((integration) => integration.notificationChannel)
  .filter(_.identity)

exports.newTicket = (ticket, author, assignee) => {
  return Promise.all(
    channels.map((channel) =>
      Promise.resolve(channel.newTicket?.(ticket, author, assignee)).catch(captureException)
    )
  ).then(() => {
    if (!assignee) {
      return
    }
    return new Notification().save({
      latestAction: 'newTicket',
      ticket,
      // from: author,
      user: assignee,
      unreadCount: 1,
      ACL: {
        [assignee.id]: { write: true, read: true },
      },
    })
  })
}

exports.replyTicket = (ticket, reply, replyAuthor) => {
  const to = reply.get('isCustomerService') ? ticket.get('author') : ticket.get('assignee')
  const data = {
    ticket,
    reply,
    from: replyAuthor,
    to,
    isCustomerServiceReply: reply.get('isCustomerService'),
  }
  return Promise.all(
    channels.map((channel) => Promise.resolve(channel.replyTicket?.(data)).catch(captureException))
  )
    .then(() => {
      if (!to) {
        return
      }
      return getNotification(ticket, to)
    })
    .then((notification) =>
      notification
        .set('latestAction', 'reply')
        .increment('unreadCount', 1)
        .save(null, { useMasterKey: true })
    )
    .then(() => {
      return new AV.Query('Watch')
        .equalTo('ticket', ticket)
        .limit(1000)
        .find({ useMasterKey: true })
    })
    .then((watches) => {
      const notificationPromises = watches.map((watch) => {
        if (watch.get('user').id === to.id) {
          return
        }
        return getNotification(ticket, to).then((notification) =>
          notification.set('latestAction', 'reply').increment('unreadCount', 1)
        )
      })
      return Promise.all(notificationPromises).then((notifications) =>
        AV.Object.saveAll(notifications, { useMasterKey: true })
      )
    })
}

exports.changeAssignee = (ticket, operator, assignee) => {
  return Promise.all(
    channels.map((channel) =>
      Promise.resolve(channel.changeAssignee?.(ticket, operator, assignee)).catch(captureException)
    )
  ).then(() => {
    if (!assignee) {
      return
    }
    return getNotification(ticket, assignee).then((notification) =>
      notification
        .set('latestAction', 'changeAssignee')
        .increment('unreadCount', 1)
        .save(null, { useMasterKey: true })
    )
  })
}

exports.ticketEvaluation = (ticket, author, to) => {
  return Promise.all(
    channels.map((channel) =>
      Promise.resolve(channel.ticketEvaluation?.(ticket, author, to)).catch(captureException)
    )
  ).then(() => {
    if (!to) {
      return
    }
    return getNotification(ticket, to).then((notification) =>
      notification
        .set('latestAction', 'ticketEvaluation')
        .increment('unreadCount', 1)
        .save(null, { useMasterKey: true })
    )
  })
}

exports.changeStatus = async function (ticket, operator) {
  const watches = await new AV.Query('Watch')
    .equalTo('ticket', ticket)
    .limit(1000)
    .find({ useMasterKey: true })
  const targets = _.uniqBy(
    [...watches, ticket.get('author'), ticket.get('assignee')].filter(_.identity),
    (user) => user.id
  )
  targets.forEach((target) => {
    if (target.id === operator.id) return
    getNotification(ticket, target)
      .then((notification) =>
        notification
          .set('latestAction', 'changeStatus')
          .increment('unreadCount', 1)
          .save(null, { useMasterKey: true })
      )
      .catch(console.error)
  })
}

const sendDelayNotify = (ticket, to) => {
  return Promise.all(
    channels.map((channel) =>
      Promise.resolve(channel.delayNotify?.(ticket, to)).catch(captureException)
    )
  )
}

let SLA = 120
getConfigValue('SLA_in_mimutes')
  .then((SLA_in_mimutes) => {
    if (SLA_in_mimutes === null) return
    if (SLA_in_mimutes > 0) {
      SLA = SLA_in_mimutes
      console.log(`[Config] SLA: ${SLA} mins`)
      return
    }
    throw new Error('SLA_in_mimutes config must be a positive integer.')
  })
  .catch(console.error)

const delayNotify = () => {
  const deadline = new Date(Date.now() - SLA * 60 * 1000)
  return (
    // find all tickets that needs customer service
    new AV.Query('Ticket')
      .containedIn('status', [TICKET_STATUS.WAITING_CUSTOMER_SERVICE, TICKET_STATUS.NEW])
      // updatedAt before SLA
      .lessThanOrEqualTo('updatedAt', deadline)
      .include('assignee')
      .find({ useMasterKey: true })
      .then((tickets) => {
        return Promise.each(tickets, (ticket) => {
          return new AV.Query('OpsLog')
            .equalTo('ticket', ticket)
            .descending('createdAt')
            .limit(1)
            .find({ useMasterKey: true })
            .then((opsLogs) => {
              const opsLog = opsLogs[0]
              const assignee = ticket.get('assignee')
              if (!assignee) return
              if (opsLog.get('action') !== 'replySoon') {
                // the ticket which is being progressed do not need notify
                return sendDelayNotify(ticket, assignee)
              } else if (opsLog.createdAt < ticket.get('latestReply')?.createdAt) {
                // Maybe the replySoon is out of date.
                return sendDelayNotify(ticket, assignee)
              }
              return
            })
            .catch((err) => {
              errorHandler.captureException({ ticketId: ticket.id }, err)
            })
        })
      })
      .catch((err) => {
        errorHandler.captureException(err)
      })
  )
}

AV.Cloud.define('delayNotify', () => {
  delayNotify()
})
