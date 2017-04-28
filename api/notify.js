const mail = require('./mail')
const bearychat = require('./bearychat')
const onlineNotification = require('./onlineNotification')

exports.newTicket = (ticket, author) => {
  ticket.get('assignee').fetch({}, {useMasterKey: true})
  .then((assignee) => {
    return Promise.all([
      onlineNotification.newTicket(ticket, author, assignee),
      mail.newTicket(ticket, author, assignee),
      bearychat.newTicket(ticket, author, assignee)
    ])
  })
}

exports.replyTicket = (ticket, reply, replyAuthor) => {
  const to = reply.get('isCustomerService') ? ticket.get('author') : ticket.get('assignee')
  return Promise.all([
    onlineNotification.replyTicket(ticket, reply, replyAuthor, to),
    mail.replyTicket(ticket, reply, replyAuthor, to),
    bearychat.replyTicket(ticket, reply, replyAuthor, to),
  ])
}
