/* eslint-disable i18n/no-chinese-character */

const { WebClient } = require('@slack/web-api')
const { getTicketUrl } = require('../../api/common')

function basicMessage(text, ticketContent) {
  return {
    text,
    attachments: [
      {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: ticketContent,
            },
          },
        ],
      },
    ],
  }
}

function newTicketMessage({ author, assignee = '<未分配>', title, nid, url, content }) {
  return basicMessage(
    `:envelope: ${author} 提交工单 <${url}|#${nid}> 给 ${assignee}`,
    `${title}\n\n${content}`
  )
}

function changeAssigneeMessage({ from, to = '<未分配>', title, nid, url, latestReply = '<还没有回复>' }) {
  return basicMessage(
    `:arrows_counterclockwise: ${from} 转移工单 <${url}|#${nid}> 给 ${to}`,
    `${title}\n\n${latestReply}`
  )
}

function replyTicketMessage({ author, url, nid, title, reply }) {
  return basicMessage(
    `:left_speech_bubble: ${author} 回复工单 <${url}|#${nid}>`,
    `${title}\n\n${reply}`
  )
}

function delayNotifyMessage({ assignee, nid, url, title, latestReply = '<还没有回复>' }) {
  return basicMessage(
    `:alarm_clock: 提醒 ${assignee} 回复工单 <${url}|#${nid}>`,
    `${title}\n\n${latestReply}`
  )
}

function evaluateTicketMessage({ star, author, nid, url, title, evaluation = '' }) {
  return basicMessage(
    `${star === 1 ? ':thumbsup:' : ':thumbsdown:'} ${author} 评价工单 <${url}|#${nid}>`,
    `${title}\n\n${evaluation}`
  )
}

class SlackIntegration {
  constructor({ token, broadcastChannel }) {
    this._userIdByEmail = new Map()
    this._IMChannelByUserId = new Map()
    this.client = new WebClient(token)
    this.broadcastChannel = broadcastChannel

    this.name = 'Slack'
    this.notificationChannel = {
      newTicket: this.notifyNewTicket.bind(this),
      changeAssignee: this.notifyChangeAssignee.bind(this),
      replyTicket: this.notifyReplyTicket.bind(this),
      delayNotify: this.delayNotify.bind(this),
      ticketEvaluation: this.notifyEvaluation.bind(this),
    }
  }

  async getUserIdByEmail(email) {
    if (this._userIdByEmail.has(email)) {
      return this._userIdByEmail.get(email)
    }
    const { user } = await this.client.users.lookupByEmail({ email })
    if (user) {
      this._userIdByEmail.set(email, user.id)
      return user.id
    }
    return null
  }

  async getIMChannelByUserId(userId) {
    if (this._IMChannelByUserId.has(userId)) {
      return this._IMChannelByUserId.get(userId)
    }
    const { channel } = await this.client.conversations.open({ users: userId })
    if (channel) {
      this._IMChannelByUserId.set(userId, channel.id)
      return channel.id
    }
    return null
  }

  sendToChannel(channel, messageObject) {
    return this.client.chat.postMessage({ channel, ...messageObject })
  }

  async send(email, messageObject) {
    const userId = await this.getUserIdByEmail(email)
    if (!userId) {
      return
    }
    const channel = await this.getIMChannelByUserId(userId)
    if (!channel) {
      return
    }
    await this.sendToChannel(channel, messageObject)
  }

  async broadcast(messageObject) {
    if (this.broadcastChannel) {
      await this.sendToChannel(this.broadcastChannel, messageObject)
    }
  }

  async notifyNewTicket(ticket, from, to) {
    const message = newTicketMessage({
      author: from.get('username'),
      assignee: to?.get('username'),
      title: ticket.get('title'),
      content: ticket.get('content'),
      nid: ticket.get('nid'),
      url: getTicketUrl(ticket),
    })
    if (to?.has('email')) {
      this.send(to.get('email'), message)
    }
    this.broadcast(message)
  }

  async notifyChangeAssignee(ticket, from, to) {
    const message = changeAssigneeMessage({
      from: from.get('username'),
      to: to?.get('username'),
      title: ticket.get('title'),
      nid: ticket.get('nid'),
      url: getTicketUrl(ticket),
      latestReply: ticket.get('latestReply')?.content,
    })
    if (to?.has('email')) {
      this.send(to.get('email'), message)
    }
    this.broadcast(message)
  }

  async notifyReplyTicket({ ticket, reply, from, to, isCustomerServiceReply }) {
    if (isCustomerServiceReply) {
      return
    }
    const message = replyTicketMessage({
      author: from.get('username'),
      nid: ticket.get('nid'),
      url: getTicketUrl(ticket),
      title: ticket.get('title'),
      reply: reply.get('content'),
    })
    if (to?.has('email')) {
      this.send(to.get('email'), message)
    }
    this.broadcast(message)
  }

  async delayNotify(ticket, to) {
    const message = delayNotifyMessage({
      assignee: to.get('username'),
      nid: ticket.get('nid'),
      url: getTicketUrl(ticket),
      title: ticket.get('title'),
      latestReply: ticket.get('latestReply')?.content,
    })
    if (to?.has('email')) {
      this.send(to.get('email'), message)
    }
    this.broadcast(message)
  }

  async notifyEvaluation(ticket, from, to) {
    const { star, content: evaluation } = ticket.get('evaluation')
    const message = evaluateTicketMessage({
      star,
      evaluation,
      author: from.get('username'),
      title: ticket.get('title'),
      nid: ticket.get('nid'),
      url: getTicketUrl(ticket),
    })
    if (to?.has('email')) {
      this.send(to.get('email'), message)
    }
    this.broadcast(message)
  }
}

module.exports = (config) => new SlackIntegration(config)
