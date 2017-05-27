const router = require('express').Router()
const Promise = require('bluebird')
const _ = require('lodash')
const wechat = require('wechat-enterprise')
const AV = require('leanengine')

const common = require('./common')
const errorHandler = require('./errorHandler')

Promise.promisifyAll(wechat.API.prototype)

const config = require('../config')

const wechatConfig = {
  token: config.wechatToken,
  encodingAESKey: config.wechatEncodingAESKey,
  corpId: config.wechatCorpID,
}

const api = new wechat.API(config.wechatCorpID, config.wechatSecret, config.wechatAgentId, (cb) => {
  new AV.Query('Config')
  .equalTo('key', 'wechatToken')
  .descending('createdAt')
  .first({useMasterKey: true})
  .then((token) => {
    if (token && token.createdAt > new Date(new Date().getTime() - 7200)) {
      cb(null, JSON.parse(token.get('value')))
    } else {
      cb(null, null)
    }
  })
  .catch(cb)
}, (token, cb) => {
  new AV.Object('Config')
  .save({key: 'wechatToken', value: JSON.stringify(token)})
  .then(() => {
    cb()
  })
  .catch(cb)
})

AV.Cloud.define('getWechatEnterpriseUsers', (req, res) => {
  common.isCustomerService(req.currentUser)
  .then((isCustomerService) => {
    if (!isCustomerService) {
      return res.error('unauthorized')
    }
    return getUsers()
  })
  .then((users) => {
    res.success(users)
  })
  .catch(res.error)
})

router.use('/', wechat(wechatConfig, function (req, res, _next) {
  res.writeHead(200)
  res.end('ok')
}))

exports.newTicket = (ticket, from, to) => {
  if (!to.get('wechatEnterpriseUserId')) {
    return Promise.resolve()
  }
  send({
    to: to.get('wechatEnterpriseUserId'),
    title: `${ticket.get('title')} (#${ticket.get('nid')})`,
    content: ticket.get('content'),
    url: common.getTicketUrl(ticket),
  })
}

exports.replyTicket = (ticket, reply, from, to) => {
  if (!to.get('wechatEnterpriseUserId')) {
    return Promise.resolve()
  }
  send({
    to: to.get('wechatEnterpriseUserId'),
    title: `${ticket.get('title')} (#${ticket.get('nid')})`,
    content: reply.get('content'),
    url: common.getTicketUrl(ticket),
  })
}

const send = (params) => {
  return api.sendAsync({
    touser: params.to
  }, {
    msgtype: 'news',
    news: {
      articles:[
        {
          title: params.title,
          description: params.content,
          url: params.url
        }
      ]
    },
  })
  .catch((err) => {
    errorHandler.captureException({
      action: 'sendWechatMessage',
      params
    }, err)
  })
}

const getUsers = () => {
  return api.getDepartmentsAsync()
  .then((data) => {
    if (data.errcode !== 0) {
      throw new Error(`wechat enterprise get departments err: code=${data.errcode}, msg=${data.errmsg}`)
    }
    return Promise.map(data.department, (department) => {
      return api.getDepartmentUsersAsync(department.id, 1, 1)
      .then((data) => {
        if (data.errcode !== 0) {
          throw new Error(`wechat enterprise get department Users err: code=${data.errcode}, msg=${data.errmsg}`)
        }
        return data.userlist
      })
    })
  })
  .then(_.flatten)
  .then((users) => {
    return _.uniqWith(users, _.isEqual)
  })
}

exports.router = router

