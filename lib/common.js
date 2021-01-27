const md5 = require('blueimp-md5')
const _ = require('lodash')
const moment = require('moment')

exports.TIME_RANGE_MAP = {
  'thisMonth':{
    starts:moment().startOf('month').toDate(),
    ends: moment().endOf('month').toDate(),
  },
  'lastMonth':{
    starts:moment().startOf('month').subtract('month',1).toDate(),
    ends: moment().endOf('month').subtract('month',1).endOf('month').toDate(),
  },
  'monthBeforeLast':{
    starts:moment().startOf('month').subtract('month',2).toDate(),
    ends: moment().endOf('month').subtract('month',2).endOf('month').toDate(),
  }
}

exports.TICKET_STATUS = {
  // 0~99 未开始处理
  NEW: 50, // 新工单，还没有技术支持人员回复
  // 100~199 处理中
  WAITING_CUSTOMER_SERVICE: 120,
  WAITING_CUSTOMER: 160,
  // 200~299 处理完成
  PRE_FULFILLED: 220, // 技术支持人员点击“解决”时会设置该状态，用户确认后状态变更为 FULFILLED
  FULFILLED: 250, // 已解决
  CLOSED: 280, // 已关闭
}

exports.TICKET_STATUS_MSG = {
  [exports.TICKET_STATUS.NEW]: 'statusNew',
  [exports.TICKET_STATUS.WAITING_CUSTOMER_SERVICE]: 'statusWaitingCustomerService',
  [exports.TICKET_STATUS.WAITING_CUSTOMER]: 'statusWaitingCustomer',
  [exports.TICKET_STATUS.PRE_FULFILLED]: 'statusPreFulfilled',
  [exports.TICKET_STATUS.FULFILLED]: 'statusFulfilled',
  [exports.TICKET_STATUS.CLOSED]: 'statusClosed',
}

exports.USER_TAG_NAME = {
  NEW: 'new',
  EARLY_ADOPTER: 'early-adopter',
  VIP: 'vip'
}

exports.USER_TAG = {
  [exports.USER_TAG_NAME.NEW]: {
    name: '🆕',
    tip: 'Registered within 3 months'
  },
  [exports.USER_TAG_NAME.EARLY_ADOPTER]: {
    name: '💖',
    tip: 'Registered before 2 years ago'
  },
  [exports.USER_TAG_NAME.VIP]: {
    name: '💎'
  }
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
    exports.TICKET_STATUS.CLOSED,
  ]
}

exports.isTicketOpen = (ticket) => {
  return exports.ticketOpenedStatuses().indexOf(ticket.get('status')) != -1
}

exports.getGravatarHash = (email) => md5(email.trim().toLocaleLowerCase() || '')

const regionMetadatas = [
  {
    region: 'cn-n1',
    regionText: '华北',
    serverDomain: 'https://leancloud.cn',
    oauthPlatform: 'leancloud',
  },
  {
    region: 'cn-e1',
    regionText: '华东',
    serverDomain: 'https://tab.leancloud.cn',
    oauthPlatform: 'leancloud_cn_e1',
  },
  {
    region: 'us-w1',
    regionText: '北美',
    serverDomain: 'https://console.leancloud.app',
    oauthPlatform: 'leancloud_us_w1',
  },
]

exports.defaultLeanCloudRegion = 'cn-n1'

exports.getLeanCloudRegions = () => {
  return _.map(regionMetadatas, metadata => {
    return metadata.region
  })
}

exports.getLeanCloudServerDomain = (region) => {
  const metadata = _.find(regionMetadatas, {region})
  if (!metadata) {
    throw new Error('unsupported region: ' + region)
  }
  return metadata.serverDomain
}

exports.getLeanCloudPlatform = (region) => {
  const metadata = _.find(regionMetadatas, {region})
  if (!metadata) {
    throw new Error('unsupported region: ' + region)
  }
  return metadata.oauthPlatform
}

exports.getLeanCloudRegionText = (region) => {
  const metadata = _.find(regionMetadatas, {region})
  if (!metadata) {
    throw new Error('unsupported region: ' + region)
  }
  return metadata.regionText
}

exports.getTinyUserInfo = async (user) => {
  if (!user) {
    return
  }
  if (!user.get('username')) {
    await user.fetch()
  }
  return {
    objectId: user.id,
    username: user.get('username'),
    name: user.get('name'),
    gravatarHash: exports.getGravatarHash(user.get('email')),
    tags: exports.getUserTags(user)
  }
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

exports.getTicketAcl = (ticketAuthor, organization) => {
  const result = {
    [ticketAuthor.id]: {write: true, read: true},
    'role:customerService': {write: true, read: true},
  }
  if (organization) {
    result['role:' + exports.getOrganizationRoleName(organization)] = {write: true, read: true}
  }
  return result
}

exports.getUserDisplayName = (user) =>
  user.get ? user.get('name') || user.get('username') : undefined

exports.getUserTags = (user) => {
  const userTags = []
  const now = moment()
  const createdAt = moment(user.get('createdAt'))
  if (now.diff(createdAt, 'month') <= 3) {
    userTags.push(exports.USER_TAG_NAME.NEW)
  }
  if (now.diff(createdAt, 'year') >= 2) {
    userTags.push(exports.USER_TAG_NAME.EARLY_ADOPTER)
  }
  if (user.has('tags')) {
    user.get('tags').forEach(tag => userTags.push(tag))
  }
  return _.uniq(userTags)
}
