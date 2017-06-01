const request = require('request-promise')
const AV = require('leanengine')

const { NewReplyNotificaion } = require('../modules/notification')

exports.newTicket = (ticket, _from, _to) => {
  return new AV.Object('_Conversation').save({
    tr: true,
    ticket: ticket.get('nid'),
  })
}

exports.replyTicket = ({ticket, reply}) => {
  return new AV.Query('_Conversation')
  .equalTo('ticket', ticket.get('nid'))
  .first({useMasterKey: true})
  .then(conversation => {
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
  })
}
