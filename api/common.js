const Promise = require('bluebird')
const _ = require('lodash')
const Remarkable = require('remarkable')
const hljs = require('highlight.js')
const AV = require('leanengine')
const mem = require('p-memoize')

const config = require('../config')

Object.assign(module.exports, require('../lib/common'))

/**
 * @param {AV.Object} user
 * @returns {Promise<{
 *   objectId: string;
 *   username: string;
 *   name: string;
 *   email: string;
 * }>}
 */
exports.getTinyUserInfo = async (user) => {
  if (!user.has('username')) {
    await user.fetch({ keys: ['username', 'name', 'email'] }, { useMasterKey: true })
  }
  return {
    objectId: user.id,
    username: user.get('username'),
    name: user.get('name'),
    email: user.get('email'),
  }
}

const getRoles = mem(
  (user) =>
    new AV.Query(AV.Role)
      .equalTo('users', user)
      .containedIn('name', ['staff', 'customerService', 'admin', 'collaborator'])
      .find()
      .then((roles) => roles.map((role) => role.get('name'))),
  { maxAge: 10_000 }
)

exports.getRoles = getRoles

exports.isCustomerService = async (user, ticketAuthor) => {
  if (!user) {
    return Promise.resolve(false)
  }
  if (ticketAuthor && ticketAuthor.id === user.id) {
    // 如果是客服自己提交工单，则当前客服在该工单中认为是用户，
    // 这时为了方便工单作为内部工作协调使用。
    return Promise.resolve(false)
  }
  const roles = await getRoles(user)
  return roles.includes('customerService') || roles.includes('admin')
}

exports.isStaff = async (user, ticketAuthor) => {
  if (!user) {
    return Promise.resolve(false)
  }
  if (ticketAuthor && ticketAuthor.id === user.id) {
    // 如果是客服自己提交工单，则当前客服在该工单中认为是用户，
    // 这时为了方便工单作为内部工作协调使用。
    return Promise.resolve(false)
  }
  const roles = await getRoles(user)
  return roles.includes('staff') || roles.includes('customerService') || roles.includes('admin')
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
  query.limit(1000).ascending('createdAt')
  const innerFn = () => {
    return query.find(authOptions).then((datas) => {
      if (datas.length === 0) {
        return
      }
      return Promise.each(datas, fn).then(() => {
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
    .limit(1000)
    .find(authOptions)
    .then((categories) => {
      return exports.makeTree(categories)
    })
}
