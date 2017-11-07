const mail = require('./mail')
const bearychat = require('./bearychat')
const wechat = require('./wechat')
const AV = require('leanengine')

exports.newTicket = (ticket, author, assignee) => {
  return Promise.all([
    mail.newTicket(ticket, author, assignee),
    bearychat.newTicket(ticket, author, assignee),
    wechat.newTicket(ticket, author, assignee),
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
    mail.replyTicket(data),
    bearychat.replyTicket(data),
    wechat.replyTicket(data),
  ])
}

exports.changeAssignee = (ticket, operator, assignee) => {
  return Promise.all([
    mail.changeAssignee(ticket, operator, assignee),
    bearychat.changeAssignee(ticket, operator, assignee),
    wechat.changeAssignee(ticket, operator, assignee),
  ])
}

exports.ticketEvaluation = (ticket, author, to) => {
  return bearychat.ticketEvaluation(ticket, author, to)
}

const delayNotify = () => { 
  const deadline = new Date(Date.now() - 2 * 60 * 60 *1000);
  new AV.Query('Ticket')
  // find all tickets that needs customer service
  .equalTo('status', 120)
  // updatedAt before 2h
  .lessThanOrEqualTo('updatedAt', deadline)
  .include('assignee')
  .find({useMasterKey: true})
  .then((tickets) => {
    tickets.forEach((ticket) => {
      new AV.Query('OpsLog')
      .equalTo('ticket', ticket)
      .descending('createdAt')
      .limit(1)
      .find({useMasterKey: true})
      .then((opsLogs) => {
        const opsLog = opsLogs[0];
        // the ticket which is being progressed do not need notify
        if (opsLog.get('action') !== 'replySoon') {
          const assignee = ticket.get('assignee');
          return Promise.all([
            mail.delayNotify(ticket, assignee),
            bearychat.delayNotify(ticket, assignee),
            wechat.delayNotify(ticket, assignee),
          ])
        }
      }).catch((err) => {
        errorHandler.captureException(err);
      });
    })
  }).catch((err) => {
    errorHandler.captureException(err);
  })
}

AV.Cloud.define('delayNotify', (req, res) => {
  delayNotify();
})
