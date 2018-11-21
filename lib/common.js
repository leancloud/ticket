const crypto = require('crypto')
const _ = require('lodash')

exports.TICKET_STATUS = {
  // 0~99 未开始处理
  NEW: 50, // 新工单，还没有技术支持人员回复
  // 100~199 处理中
  WAITING_CUSTOMER_SERVICE: 120,
  WAITING_CUSTOMER: 160,
  // 200~299 处理完成
  PRE_FULFILLED: 220, // 技术支持人员点击“解决”时会设置该状态，用户确认后状态变更为 FULFILLED
  FULFILLED: 250, // 已解决
  REJECTED: 280, // 已关闭
}

exports.TICKET_STATUS_MSG = {
  [exports.TICKET_STATUS.NEW]: '待处理',
  [exports.TICKET_STATUS.WAITING_CUSTOMER_SERVICE]: '等待客服回复',
  [exports.TICKET_STATUS.WAITING_CUSTOMER]: '等待用户回复',
  [exports.TICKET_STATUS.PRE_FULFILLED]: '待确认解决',
  [exports.TICKET_STATUS.FULFILLED]: '已解决',
  [exports.TICKET_STATUS.REJECTED]: '已关闭',
}

exports.ticketOpenedStatuses = () => {
  return [
    exports.TICKET_STATUS.NEW,
    exports.TICKET_STATUS.WAITING_CUSTOMER_SERVICE,
    exports.TICKET_STATUS.WAITING_CUSTOMER,
  ]
}

exports.ticketClosedStatuses = () => {
  return [
    exports.TICKET_STATUS.PRE_FULFILLED,
    exports.TICKET_STATUS.FULFILLED,
    exports.TICKET_STATUS.REJECTED,
  ]
}

exports.isTicketOpen = (ticket) => {
  return exports.ticketOpenedStatuses().indexOf(ticket.get('status')) != -1
}

exports.getGravatarHash = (email) => {
  email = email || ''
  const shasum = crypto.createHash('md5')
  shasum.update(email.trim().toLocaleLowerCase())
  return shasum.digest('hex')
}

exports.makeTree = (objs) => {
  const sortFunc = (o) => {
    return o.get('order') != null ? o.get('order') : o.createdAt.getTime()
  }
  const innerFunc = (parents, children) => {
    if (parents && children) {
      parents.forEach(p => {
        const [cs, others] = _.partition(children, c => c.get('parent').id == p.id)
        p.children = _.sortBy(cs, sortFunc)
        cs.forEach(c => c.parent = p)
        innerFunc(p.children, others)
      })
    }
  }
  const [parents, children] = _.partition(objs, o => !o.get('parent'))
  innerFunc(parents, children)
  return _.sortBy(parents, sortFunc)
}

exports.depthFirstSearchMap = (array, fn) => {
  return _.flatten(array.map((a, index, array) => {
    const result = fn(a, index, array)
    if (a.children) {
      return [result, ...exports.depthFirstSearchMap(a.children, fn)]
    }
    return result
  }))
}

exports.depthFirstSearchFind = (array, fn) => {
  for (let i = 0; i < array.length; i++) {
    const obj = array[i]
    if (fn(obj)) {
      return obj
    }

    if (obj.children) {
      const finded = exports.depthFirstSearchFind(obj.children, fn)
      if (finded) {
        return finded
      }
    }
  }
}

exports.getTinyCategoryInfo = (category) => {
  return {
    objectId: category.id,
    name: category.get('name'),
  }
}

exports.getOrganizationRoleName = (organization, isAdmin) => {
  return organization.id + (isAdmin ? '_admin' : '_member')
}

exports.getTicketAcl = (author, organization) => {
  const result = {
    [author.id]: {write: true, read: true},
    'role:customerService': {write: true, read: true},
  }
  if (organization) {
    result['role:' + exports.getOrganizationRoleName(organization)] = {write: true, read: true}
  }
  return result
}
