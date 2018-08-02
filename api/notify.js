const Promise = require('bluebird')
const AV = require('leanengine')

const mail = require('./mail')
const bearychat = require('./bearychat')
const wechat = require('./wechat')

const {TICKET_STATUS} = require('../lib/common')
const errorHandler = require('./errorHandler')

exports.newTicket = (ticket, author, assignee) => {
  return Promise.all([
    mail.newTicket(ticket, author, assignee).catch(err => errorHandler.captureException(err)),
    bearychat.newTicket(ticket, author, assignee).catch(err => errorHandler.captureException(err)),
    wechat.newTicket(ticket, author, assignee).catch(err => errorHandler.captureException(err)),
  ])
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
  return Promise.all([
    mail.replyTicket(data).catch(err => errorHandler.captureException(err)),
    bearychat.replyTicket(data).catch(err => errorHandler.captureException(err)),
    wechat.replyTicket(data).catch(err => errorHandler.captureException(err)),
  ])
}

exports.changeAssignee = (ticket, operator, assignee) => {
  return Promise.all([
    mail.changeAssignee(ticket, operator, assignee).catch(err => errorHandler.captureException(err)),
    bearychat.changeAssignee(ticket, operator, assignee).catch(err => errorHandler.captureException(err)),
    wechat.changeAssignee(ticket, operator, assignee).catch(err => errorHandler.captureException(err)),
  ])
}

exports.ticketEvaluation = (ticket, author, to) => {
  return bearychat.ticketEvaluation(ticket, author, to)
}

const sendDelayNotify = (ticket, to) => {
  return Promise.all([
    mail.delayNotify(ticket, to).catch(err => errorHandler.captureException(err)),
    bearychat.delayNotify(ticket, to).catch(err => errorHandler.captureException(err)),
    wechat.delayNotify(ticket, to).catch(err => errorHandler.captureException(err)),
  ])
}

const delayNotify = () => { 
  // find all tickets that needs customer service
  const needReplyQuery = new AV.Query('Ticket').equalTo('status', TICKET_STATUS.WAITING_CUSTOMER_SERVICE)
  // find all tickets
  const newTicketQuery = new AV.Query('Ticket').equalTo('status', TICKET_STATUS.NEW)
  
  const deadline = new Date(Date.now() - 2 * 60 * 60 *1000)
  return new AV.Query.or(needReplyQuery, newTicketQuery)
  // updatedAt before 2h
  .lessThanOrEqualTo('updatedAt', deadline)
  .include('assignee')
  .find({useMasterKey: true})
  .then((tickets) => {
    return Promise.each(tickets, (ticket) => {
      return new AV.Query('OpsLog')
      .equalTo('ticket', ticket)
      .descending('createdAt')
      .limit(1)
      .find({useMasterKey: true})
      .then((opsLogs) => {
        const opsLog = opsLogs[0]
        const assignee = ticket.get('assignee')
        if (opsLog.get('action') !== 'replySoon') {
          // the ticket which is being progressed do not need notify
          return sendDelayNotify(ticket, assignee)
        } else if (opsLog.updatedAt < ticket.updatedAt) {
          // Maybe the replySoon is out of date.
          return sendDelayNotify(ticket, assignee)
        }
        return
      }).catch((err) => {
        errorHandler.captureException({ticketId: ticket.id}, err)
      })
    })
  }).catch((err) => {
    errorHandler.captureException(err)
  })
}

AV.Cloud.define('delayNotify', () => {
  delayNotify()
})
