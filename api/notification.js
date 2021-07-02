const _ = require('lodash')
const Promise = require('bluebird')
const AV = require('leanengine')

const { TICKET_STATUS } = require('../lib/common')
const errorHandler = require('./errorHandler')
const captureException = (err) => errorHandler.captureException(err)

const { integrations, getConfigValue } = require('../config')

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
    return new AV.Object('Message').save({
      type: 'newTicket',
      ticket,
      from: author,
      to: assignee,
      isRead: false,
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
      return new AV.Object('Message', {
        type: 'reply',
        ticket,
        reply,
        from: replyAuthor,
        to,
        isRead: false,
        ACL: {
          [to.id]: { write: true, read: true },
        },
      }).save()
    })
    .then(() => {
      return new AV.Query('Watch')
        .equalTo('ticket', ticket)
        .limit(1000)
        .find({ useMasterKey: true })
    })
    .then((watches) => {
      const messages = watches.map((watch) => {
        if (watch.get('user').id === to.id) {
          return
        }
        return new AV.Object('Message', {
          type: 'reply',
          ticket,
          reply,
          from: replyAuthor,
          to: watch.get('user'),
          isRead: false,
          ACL: {
            [watch.get('user').id]: { write: true, read: true },
          },
        })
      })
      return AV.Object.saveAll(messages)
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
    return new AV.Object('Message', {
      type: 'changeAssignee',
      ticket,
      from: operator,
      to: assignee,
      isRead: false,
      ACL: {
        [assignee.id]: { write: true, read: true },
      },
    }).save()
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
    return new AV.Object('Message', {
      type: 'ticketEvaluation',
      ticket,
      from: author,
      to: to,
      isRead: false,
      ACL: {
        [to.id]: { write: true, read: true },
      },
    }).save()
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
