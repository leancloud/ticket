const express = require('express')
const Promise = require('bluebird')
const _ = require('lodash')
const wechat = require('wechat-enterprise')
const AV = require('leanengine')

const common = require('../../api/common')
const { getUserDisplayName } = common

Promise.promisifyAll(wechat.API.prototype)

module.exports = (configs) => {
  const { corpId, secret, agentId, token, encodingAESKey } = configs

  if (!token) {
    throw new Error('缺少微信 token')
  }

  const router = express.Router()
  router.use(
    '/',
    wechat(
      {
        token,
        encodingAESKey,
        corpId,
      },
      function (req, res, _next) {
        res.status(200).send('ok')
      }
    )
  )

  let api = null

  const getUsers = () => {
    if (api === null) {
      return []
    }

    return api
      .getDepartmentsAsync()
      .then((data) => {
        if (data.errcode !== 0) {
          throw new Error(
            `wechat enterprise get departments err: code=${data.errcode}, msg=${data.errmsg}`
          )
        }
        return Promise.map(
          data.department,
          (department) => {
            return api.getDepartmentUsersAsync(department.id, 1, 1).then((data) => {
              if (data.errcode !== 0) {
                throw new Error(
                  `wechat enterprise get department Users err: code=${data.errcode}, msg=${data.errmsg}`
                )
              }
              return data.userlist
            })
          },
          { concurrency: 2 }
        )
      })
      .then(_.flatten)
      .then((users) => {
        return _.uniqWith(users, _.isEqual)
      })
  }

  const send = (params) => {
    if (api === null) {
      return
    }

    return api.sendAsync(
      {
        touser: params.to,
      },
      {
        msgtype: 'news',
        news: {
          articles: [
            {
              title: params.title,
              description: params.content,
              url: params.url,
            },
          ],
        },
      }
    )
  }

  const notificationChannel = {}

  notificationChannel.newTicket = (ticket, from, to) => {
    if (!to?.get('wechatEnterpriseUserId')) {
      return Promise.resolve()
    }
    return send({
      to: to.get('wechatEnterpriseUserId'),
      title: `${ticket.get('title')} (#${ticket.get('nid')})`,
      content: ticket.get('content'),
      url: common.getTicketUrl(ticket),
    })
  }

  notificationChannel.replyTicket = ({ ticket, reply, to }) => {
    if (!to?.get('wechatEnterpriseUserId')) {
      return Promise.resolve()
    }
    return send({
      to: to.get('wechatEnterpriseUserId'),
      title: `${ticket.get('title')} (#${ticket.get('nid')})`,
      content: reply.get('content'),
      url: common.getTicketUrl(ticket),
    })
  }

  notificationChannel.changeAssignee = (ticket, from, to) => {
    if (!to?.get('wechatEnterpriseUserId')) {
      return Promise.resolve()
    }
    return send({
      to: to.get('wechatEnterpriseUserId'),
      title: `${ticket.get('title')} (#${ticket.get('nid')})`,
      content: `${getUserDisplayName(from)} 将该工单转交给您处理。
该工单的问题：

${ticket.get('content')}

该工单最后一条回复：

${ticket.get('latestReply') && ticket.get('latestReply').content}
`,
      url: common.getTicketUrl(ticket),
    })
  }

  notificationChannel.delayNotify = (ticket, to) => {
    if (!to?.get('wechatEnterpriseUserId')) {
      return Promise.resolve()
    }
    return send({
      to: to.get('wechatEnterpriseUserId'),
      title: `亲爱的 ${getUserDisplayName(to)}，快去回工单，比心👬👬👬`,
      content: `该工单的问题：

${ticket.get('content')}

该工单最后一条回复：

${ticket.get('latestReply') && ticket.get('latestReply').content}
`,
      url: common.getTicketUrl(ticket),
    })
  }

  return {
    name: 'Wechat',
    setup: () => {
      api = new wechat.API(
        corpId,
        secret,
        agentId,
        (cb) => {
          new AV.Query('Config')
            .equalTo('key', 'wechatToken')
            .descending('createdAt')
            .first({ useMasterKey: true })
            .then((token) => {
              if (token && token.createdAt > new Date(new Date().getTime() - 7200000)) {
                cb(null, token.get('value'))
              } else {
                cb(null, null)
              }
              return
            })
            .catch(cb)
        },
        async (token, cb) => {
          try {
            const expiredTokens = await new AV.Query('Config')
              .equalTo('key', 'wechatToken')
              .descending('createdAt')
              .find({ useMasterKey: true })
            await AV.Object.destroyAll(expiredTokens, { useMasterKey: true })
            await new AV.Object('Config')
              .setACL(new AV.ACL()) // 任何人无法读取，除非使用 masterKey
              .save({ key: 'wechatToken', value: token })
            cb()
          } catch (error) {
            cb(error)
          }
        }
      )

      AV.Cloud.define('getWechatEnterpriseUsers', (req, res) => {
        common
          .isCustomerService(req.currentUser)
          .then((isCustomerService) => {
            if (!isCustomerService) {
              return res.error('unauthorized')
            }
            return getUsers()
          })
          .then((users) => {
            res.success(users)
            return
          })
          .catch(res.error)
      })
    },
    notificationChannel,
    routers: [['/webhooks/wechat', router]],
  }
}
