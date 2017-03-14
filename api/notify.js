const AV = require('leancloud-storage')
const mail = require('./mail')
const request = require('request-promise')
const config = require('../config')
const { NewReplyNotificaion } = require('../modules/notification')

exports.newTicket = (ticket, author) => {
  return Promise.all([
    // online notification
    new AV.Object('_Conversation').save({
      tr: true,
      ticket: ticket.get('nid'),
    }),
    // mail
    ticket.get('assignee').fetch({}, {useMasterKey: true})
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
  ])
}

exports.replyTicket = (ticket, reply, replyAuthor) => {
  return Promise.all([
    // online notification
    new AV.Query('_Conversation').equalTo('ticket', ticket.get('nid')).first().then(conversation => {
      if (conversation) {
        return request({
          url: 'https://api.leancloud.cn/1.1/rtm/messages',
          method: 'POST',
          headers: {
            'X-LC-Id': process.env.LEANCLOUD_APP_ID,
            'X-LC-KEY': `${process.env.LEANCLOUD_APP_MASTER_KEY},master`,
          },
          json: true,
          body: {
            from_peer: 'LeanTicket Bot',
            conv_id: conversation.id,
            transient: true,
            message: JSON.stringify(new NewReplyNotificaion({
              id: reply.id
            }).toJSON()),
          }
        })
      }
    }),
    // mail    
    Promise.resolve().then(() => {
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
    })
  ])
}
