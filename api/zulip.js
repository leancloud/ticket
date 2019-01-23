const _ = require('lodash')
const zulip = require('zulip-js')

const {username, apiKey, realm, stream, topic} = require('../config').zulip
const {getTicketUrl, getUserDisplayName} = require('./common')
const errorHandler = require('./errorHandler')


if (!username) {
  console.log('Zulip 没有配置，所以相关消息通知无法使用。')
  exports.newTicket = async () => {}
  exports.replyTicket = async () => {}
  exports.changeAssignee = async () => {}
  exports.delayNotify = async () => {}
  exports.ticketEvaluation = async () => {}

} else {
  zulip({
    username,
    apiKey,
    realm,
  }).then(client => {

    let users = []
    setInterval(() => {
      return client.users.retrieve().then(result => {
        users = result.members
        return
      })
    }, 1000 * 60 * 5)

    exports.newTicket = async (ticket, from, to) => {
      const content = `:envelope: ${getUserDisplayName(from)} 提交 [工单 #${ticket.get('nid')}](${getTicketUrl(ticket)}) 给 ${getUserDisplayName(to)}
~~~ quote
${ticket.get('title')}

${ticket.get('content')}
~~~`
      await send(to, content)
      await client.messages.send({
        type: 'stream',
        to: stream,
        subject: topic,
        content,
      })
    }

    exports.replyTicket = async ({ticket, reply, from, to, isCustomerServiceReply}) => {
      if (isCustomerServiceReply) {
        return
      }

      const content = `:left_speech_bubble: ${getUserDisplayName(from)} 回复 [工单 #${ticket.get('nid')}](${getTicketUrl(ticket)})
~~~ quote
${ticket.get('title')}

${reply.get('content')}
~~~`
      await send(to, content)
      await client.messages.send({
        type: 'stream',
        to: stream,
        subject: topic,
        content,
      })
    }

    exports.changeAssignee = async (ticket, from ,to) => {
      const content = `:arrows_counterclockwise: ${getUserDisplayName(from)} 转移 [工单 #${ticket.get('nid')}](${getTicketUrl(ticket)}) 给 ${getUserDisplayName(to)}
~~~ quote
${ticket.get('title')}

${ticket.get('latestReply') && ticket.get('latestReply').content || '<还没有回复>'}
~~~`
      await send(to, content)
      await client.messages.send({
        type: 'stream',
        to: stream,
        subject: topic,
        content,
      })
    }

    exports.delayNotify = async (ticket, to) => {
      const content = `:alarm_clock: 提醒 ${getUserDisplayName(to)} 回复 [工单 #${ticket.get('nid')}](${getTicketUrl(ticket)})
~~~ quote
${ticket.get('title')}

${ticket.get('latestReply') && ticket.get('latestReply').content}
~~~`
      await send(to, content)
      await client.messages.send({
        type: 'stream',
        to: stream,
        subject: topic,
        content,
      })
    }

    exports.ticketEvaluation = async (ticket, from, to) => {
      const {star, content: evaluationContent} = ticket.get('evaluation')
      const content = `${star == 1 ? ':thumbs_up:' : ':thumbs_down:'} ${getUserDisplayName(from)} 评价 [工单 #${ticket.get('nid')}](${getTicketUrl(ticket)})
~~~ quote
${ticket.get('title')}

${evaluationContent}
~~~`
      await send(to, content)
      await client.messages.send({
        type: 'stream',
        to: stream,
        subject: topic,
        content,
      })
    }

    const send = async (to, content) => {
      const toUser = _.find(users, {email: to.get('email')})
      if (!toUser) {
        return
      }

      const result = await client.messages.send({
        type: 'private',
        to: toUser.email,
        content,
      })
      if (result.result != 'success') {
        throw new Error(result.msg)
      }
    }

    return
  }).catch(err => {
    errorHandler.captureException(err)
  })
}
