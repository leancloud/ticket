const mail = require('./mail')
const config = require('../config')

exports.newTicket = (ticket, author) => {
  return ticket.get('assignee').fetch({}, {useMasterKey: true})
  .then((assignee) => {
    if (assignee.get('email')) {
      return mail.send({
        from: `${author.get('username')} <ticket@leancloud.cn>`,
        to: assignee.get('email'),
        subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
        text: ticket.get('content'),
        url: `${config.host}/tickets/${ticket.get('nid')}`,
      })
    }
  })
}

exports.replyTicket = (ticket, reply, replyAuthor) => {
  const to = reply.get('isCustomerService') ? ticket.get('author') : ticket.get('assignee')
  if (to.get('email')) {
    return mail.send({
      from: `${replyAuthor.get('username')} <ticket@leancloud.cn>`,
      to: to.get('email'),
      subject: `[LeanTicket] ${ticket.get('title')} (#${ticket.get('nid')})`,
      text: reply.get('content'),
      url: `${config.host}/tickets/${ticket.get('nid')}`,
    })
  }
}
