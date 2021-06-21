/* eslint-disable i18n/no-chinese-character */

const _ = require('lodash')
const { errorHandler } = require('raven')
const zulip = require('zulip-js')
const { getTicketUrl } = require('../../api/common')

module.exports = (configs) => {
  const { username, apiKey, realm, stream, topic } = configs

  if (!username) {
    throw new Error('username is required')
  }

  let users = []
  let client

  const send = async (to, content) => {
    const toUser = _.find(users, { email: to.get('email') })
    if (!toUser) {
      return
    }

    if (!client) {
      console.warn(`Failed to send message while zulip client is not ready`)
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

  const broadcast = (content) => {
    if (!client) {
      console.warn(`Failed to send message while zulip client is not ready`)
      return
    }
    return client.messages.send({
      type: 'stream',
      to: stream,
      subject: topic,
      content,
    })
  }

  return {
    name: 'Zulip',
    setup: async () => {
      client = await zulip({
        username,
        apiKey,
        realm,
      })
      const updateUsers = () => {
        return client.users
          .retrieve()
          .then((result) => {
            users = result.members
            return
          })
          .catch(errorHandler)
      }
      setInterval(updateUsers, 1000 * 60 * 15)
      updateUsers()
    },
    notificationChannel: {
      newTicket: async (ticket, from, to) => {
        if (!to) return
        const content = `:envelope: ${from.get('username')} 提交 [工单 #${ticket.get(
          'nid'
        )}](${getTicketUrl(ticket)}) 给 ${to.get('username')}
~~~ quote
${ticket.get('title')}

${ticket.get('content')}
~~~`
        await send(to, content)
        await broadcast(content)
      },
      replyTicket: async ({ ticket, reply, from, to, isCustomerServiceReply }) => {
        if (!to) return
        if (isCustomerServiceReply) {
          return
        }

        const content = `:left_speech_bubble: ${from.get('username')} 回复 [工单 #${ticket.get(
          'nid'
        )}](${getTicketUrl(ticket)})
~~~ quote
${ticket.get('title')}

${reply.get('content')}
~~~`
        await send(to, content)
        await broadcast(content)
      },
      changeAssignee: async (ticket, from, to) => {
        if (!to) return
        const content = `:arrows_counterclockwise: ${from.get('username')} 转移 [工单 #${ticket.get(
          'nid'
        )}](${getTicketUrl(ticket)}) 给 ${to.get('username')}
~~~ quote
${ticket.get('title')}

${(ticket.get('latestReply') && ticket.get('latestReply').content) || '<还没有回复>'}
~~~`
        await send(to, content)
        await broadcast(content)
      },
      delayNotify: async (ticket, to) => {
        const content = `:alarm_clock: 提醒 ${to.get('username')} 回复 [工单 #${ticket.get(
          'nid'
        )}](${getTicketUrl(ticket)})
~~~ quote
${ticket.get('title')}

${(ticket.get('latestReply') && ticket.get('latestReply').content) || '<还没有回复>'}
~~~`
        await send(to, content)
        await broadcast(content)
      },
      ticketEvaluation: async (ticket, from, to) => {
        if (!to) return
        const { star, content: evaluationContent } = ticket.get('evaluation')
        const content = `${star == 1 ? ':thumbs_up:' : ':thumbs_down:'} ${from.get(
          'username'
        )} 评价 [工单 #${ticket.get('nid')}](${getTicketUrl(ticket)})
~~~ quote
${ticket.get('title')}

${evaluationContent}
~~~`
        await send(to, content)
        await broadcast(content)
      },
    },
  }
}
