/* eslint-disable i18n/no-chinese-character */

const { WebClient } = require('@slack/web-api')
const { Router } = require('express')
const AV = require('leancloud-storage')
const { newTicketMessage, changeAssigneeMessage, replyTicketMessage } = require('./message')
const { isTicketOpen } = require('../../lib/common')

function isCloseTicketAction(actions) {
  return actions && actions.length === 1 && actions[0].text.text === '关闭工单'
}

async function getSessionTokenByEmail(email) {
  const user = await new AV.Query('_User')
    .select('objectId')
    .equalTo('email', email)
    .first({ useMasterKey: true })
  if (user) {
    await user.fetch({ keys: 'sessionToken' }, { useMasterKey: true })
    return user.getSessionToken()
  }
}

class SlackIntegration {
  constructor({ token, broadcastChannel }) {
    this._userByEmail = new Map()
    this._IMChannelByUserId = new Map()
    this.client = new WebClient(token)
    this.broadcastChannel = broadcastChannel

    const router = Router()
    router.post('/interactive-endpoint', (req, res) => {
      const payload = JSON.parse(req.body.payload)
      res.status(200).end()
      this.handleInteractiveAction(payload)
    })

    this.name = 'Slack'
    this.routers = [['/webhooks/slack', router]]
    this.notificationChannel = {
      newTicket: this.notifyNewTicket.bind(this),
      changeAssignee: this.notifyChangeAssignee.bind(this),
      replyTicket: this.notifyReplyTicket.bind(this),
    }
  }

  async findUserByEmail(email) {
    if (this._userByEmail.has(email)) {
      return this._userByEmail.get(email)
    }
    const { user } = await this.client.users.lookupByEmail({ email })
    if (user) {
      this._userByEmail.set(email, user)
      return user
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
    const user = await this.findUserByEmail(email)
    if (!user) {
      return
    }
    const channel = await this.getIMChannelByUserId(user.id)
    if (!channel) {
      return
    }
    await this.sendToChannel(channel, messageObject)
  }

  broadcast(messageObject) {
    if (this.broadcastChannel) {
      return this.sendToChannel(this.broadcastChannel, messageObject)
    }
    return Promise.resolve()
  }

  async notifyNewTicket(ticket, _from, to) {
    if (to.has('email')) {
      const slackUser = await this.findUserByEmail(to.get('email'))
      if (slackUser) {
        to.set('slack_user_id', slackUser.id)
      }
    }
    await this.broadcast(newTicketMessage(ticket, to))
  }

  async notifyChangeAssignee(ticket, from, to) {
    if (to.has('email')) {
      const slackUser = await this.findUserByEmail(to.get('email'))
      if (slackUser) {
        to.set('slack_user_id', slackUser.id)
      }
    }
    await this.broadcast(changeAssigneeMessage(ticket, to))
  }

  async notifyReplyTicket({ ticket, reply, to, isCustomerServiceReply }) {
    if (isCustomerServiceReply) {
      return
    }
    if (to.has('email')) {
      const slackUser = await this.findUserByEmail(to.get('email'))
      if (slackUser) {
        to.set('slack_user_id', slackUser.id)
      }
    }
    await this.broadcast(replyTicketMessage(ticket, to, reply))
  }

  handleInteractiveAction(payload) {
    if (payload.type === 'block_actions') {
      if (isCloseTicketAction(payload.actions)) {
        this.handleCloseTicket(payload)
      }
    }
  }

  async getUserEmailByUserId(id) {
    const { user } = await this.client.users.info({ user: id })
    return user.profile.email
  }

  async handleCloseTicket(payload) {
    const { attachments } = payload.message
    if (attachments && attachments.length) {
      attachments[0].color = '#198754'
      const { blocks } = attachments[0]
      if (blocks && blocks.length) {
        const lastBlock = blocks[blocks.length - 1]
        // remove close button
        lastBlock.elements.pop()
        this.client.chat.update({
          ...payload.message,
          channel: payload.channel.id,
        })
      }
    }

    const email = await this.getUserEmailByUserId(payload.user.id)
    if (!email) {
      return
    }

    const nid = Number(payload.actions[0].value)
    const [sessionToken, ticket] = await Promise.all([
      getSessionTokenByEmail(email),
      new AV.Query('Ticket').equalTo('nid', nid).first({ useMasterKey: true }),
    ])
    if (sessionToken && ticket && isTicketOpen(ticket)) {
      await AV.Cloud.run(
        'operateTicket',
        { ticketId: ticket.id, action: 'reject' },
        { sessionToken }
      )
    }
  }
}

module.exports = (config) => new SlackIntegration(config)
