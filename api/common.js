const Promise = require('bluebird')
const _ = require('lodash')
const Remarkable = require('remarkable')
const hljs = require('highlight.js')
const AV = require('leanengine')

const config = require('../config')

Object.assign(module.exports, require('../lib/common'))

exports.getTinyReplyInfo = (reply) => {
  return exports.getTinyUserInfo(reply.get('author'))
    .then((author) => {
      return {
        author,
        content: reply.get('content'),
        isCustomerService: reply.get('isCustomerService'),
        createdAt: reply.get('createdAt'),
        updatedAt: reply.get('updatedAt'),
      }
    })
}

exports.isCustomerService = (user, ticketAuthor) => {
  if (!user) {
    return Promise.resolve(false)
  }
  if (ticketAuthor && ticketAuthor.id === user.id) {
    // 如果是客服自己提交工单，则当前客服在该工单中认为是用户，
    // 这时为了方便工单作为内部工作协调使用。
    return Promise.resolve(false)
  }
  return new AV.Query(AV.Role)
    .equalTo('name', 'customerService')
    .equalTo('users', user)
    .first()
    .then((role) => {
      return !!role
    })
}

exports.getTicketUrl = (ticket) => {
  return `${config.host}/tickets/${ticket.get('nid')}`
}

const md = new Remarkable({
  html: true,
  breaks: true,
  linkify: true,
  typographer: false,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value
      } catch (err) {
        // ignore
      }
    }
    try {
      return hljs.highlightAuto(str).value
    } catch (err) {
      // ignore
    }
    return '' // use external default escaping
  },
})

exports.htmlify = (content) => {
  return md.render(content)
}

exports.forEachAVObject = (query, fn, authOptions) => {
  query.limit(1000)
  .ascending('createdAt')
  const innerFn = () => {
    return query.find(authOptions)
    .then((datas) => {
      if (datas.length === 0) {
        return
      }
      return Promise.each(datas, fn)
      .then(() => {
        query.greaterThan('createdAt', _.last(datas).get('createdAt'))
        return innerFn()
      })
    })
  }
  return innerFn()
}

exports.getCategoriesTree = (authOptions) => {
  return new AV.Query('Category')
    .descending('createdAt')
    .find(authOptions)
    .then(categories => {
      return exports.makeTree(categories)
    })
}

