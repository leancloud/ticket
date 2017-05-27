const mail = require('./mail')
const bearychat = require('./bearychat')
const wechat = require('./wechat')
const onlineNotification = require('./onlineNotification')

exports.newTicket = (ticket, author, assignee) => {
  return Promise.all([
    onlineNotification.newTicket(ticket, author, assignee),
    mail.newTicket(ticket, author, assignee),
    bearychat.newTicket(ticket, author, assignee),
    wechat.newTicket(ticket, author, assignee),
  ])
}

exports.replyTicket = (ticket, reply, replyAuthor) => {
  const to = reply.get('isCustomerService') ? ticket.get('author') : ticket.get('assignee')
  return Promise.all([
    onlineNotification.replyTicket(ticket, reply, replyAuthor, to),
    mail.replyTicket(ticket, reply, replyAuthor, to),
    bearychat.replyTicket(ticket, reply, replyAuthor, to),
    wechat.replyTicket(ticket, reply, replyAuthor, to),
  ])
}

exports.changeAssignee = (ticket, operator, assignee) => {
  return Promise.all([
    mail.changeAssignee(ticket, operator, assignee),
    bearychat.changeAssignee(ticket, operator, assignee),
    wechat.changeAssignee(ticket, operator, assignee),
  ])
}
