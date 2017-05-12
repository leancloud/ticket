const Promise = require('bluebird')
const _ = require('lodash')
const moment = require('moment')
const AV = require('leanengine')

const TICKET_STATUS = require('../lib/constant').TICKET_STATUS

AV.Cloud.define('statsTicket', (req, res) => {
  exports.statsTicket(req.params.objectId)
  .then(res.success)
})

exports.statsTicket = (objectId) => {
  return getTicketAndTimeline(objectId)
  .then(({ticket, timeline}) => {
    const firstReplyStats = new FirstReplyStats(ticket) 
    const replyTimeStats = new ReplyTimeStats(ticket) 
    _.forEach(timeline, (replyOrOpsLog) => {
      firstReplyStats.forEachReplyOrOpsLog(replyOrOpsLog)
      replyTimeStats.forEachReplyOrOpsLog(replyOrOpsLog)
    })
    return {
      firstReplyStats: firstReplyStats.result(),
      replyTimeStats: replyTimeStats.result(),
    }
  })
}

class FirstReplyStats {
  constructor(ticket) {
    this.ticketId = ticket.id
    this.start = ticket.createdAt
  }

  forEachReplyOrOpsLog(avObj) {
    if (this.firstReplyAt) {
      return
    }
    if (avObj.className === 'OpsLog'
        && avObj.get('action') === 'changeStatus'
        && avObj.get('data').status === TICKET_STATUS.PENDING) {
      this.firstReplyAt = avObj.createdAt
      return
    }
    if (avObj.className === 'Reply'
        && avObj.get('isCustomerService')) {
      this.firstReplyAt = avObj.createdAt
      this.userId = avObj.get('author').id
      return
    }
  }

  result() {
    return {
      ticketId: this.ticketId,
      userId: this.userId,
      firstReplyTime: this.firstReplyAt - this.start
    }
  }
}

class ReplyTimeStats {
  constructor(ticket) {
    this.ticketId = ticket.id
    this.cursor = ticket.createdAt
    this.customerServiceTimes = []
    this.isReply = false
  }

  getCustomerServiceTime(user) {
    const userId = user.id || user.objectId
    let result = _.find(this.customerServiceTimes, {userId})
    if (!result) {
      result= {ticketId: this.ticketId, userId, replyCount:0, replyTime: 0}
      this.customerServiceTimes.push(result)
    }
    return result
  }

  forEachReplyOrOpsLog(avObj) {
    if (avObj.className === 'Reply'
        && avObj.get('isCustomerService')
        && !this.isReply) {
      // 客服在用户之后回复
      const customerServiceTime = this.getCustomerServiceTime(avObj.get('author'))
      customerServiceTime.replyCount++
      customerServiceTime.replyTime += avObj.createdAt - this.cursor
      this.cursor = avObj.createdAt
      this.isReply = true
      this.lastCustomerService = avObj.get('author')
      return
    }
    if (avObj.className === 'Reply'
        && !avObj.get('isCustomerService')
        && this.isReply) {
      // 用户在客服之后回复
      this.cursor = avObj.createdAt
      this.isReply = false
      return
    }
    if (avObj.className === 'OpsLog'
        && avObj.get('action') === 'selectAssignee') {
      this.lastCustomerService = avObj.get('data').assignee
      return
    }
    if (avObj.className === 'OpsLog'
        && avObj.get('action') === 'changeAssignee'
        && !this.isReply) {
      const customerServiceTime = this.getCustomerServiceTime(this.lastCustomerService)
      customerServiceTime.replyCount++
      customerServiceTime.replyTime += avObj.createdAt - this.cursor
      this.cursor = avObj.createdAt
      this.lastCustomerService = avObj.get('data').assignee
      return
    }
  }

  result() {
    if (!this.isReply) {
      const customerServiceTime = this.getCustomerServiceTime(this.lastCustomerService)
      customerServiceTime.replyTime += new Date() - this.cursor
    }
    return this.customerServiceTimes
  }
}

const getTicketAndTimeline = (ticketObjectId) => {
  const ticket = AV.Object.createWithoutData('Ticket', ticketObjectId)
  return Promise.all([
    ticket.fetch({}, {useMasterKey: true}),
    new AV.Query('Reply')
      .equalTo('ticket', ticket)
      .limit(1000)
      .ascending('createdAt')
      .find({useMasterKey: true}),
    new AV.Query('OpsLog')
      .equalTo('ticket', ticket)
      .limit(1000)
      .ascending('createdAt')
      .find({useMasterKey: true}),
  ]).spread((ticket, replies, opsLogs) => {
    const timeline = _.chain(replies)
    .concat(opsLogs)
    .sortBy((data) => {
      return data.get('createdAt')
    }).value()
    return {ticket, timeline}
  })
}

AV.Cloud.define('getNewTicketCount', (req) => {
  const {start, end} = req.params
  return new AV.Query('Ticket')
  .greaterThanOrEqualTo('createdAt', start)
  .lessThan('createdAt', end)
  .count()
  .then((newTicketCount) => {
    return {
      start,
      end,
      newTicketCount,
    }
  })
})

AV.Cloud.define('xx', (req, res) => {
  res.success()
  let date = moment('2017-04-01')
  fn = (date) => {
    return AV.Cloud.run('cronjobGetActiveTicket', {date: date.format('YYYY-MM-DD')})
    .then(() => {
      return fn(date.subtract(1, 'days'))
    })
    .catch(console.error)
  }
  fn(moment('2017-04-01'))
})

AV.Cloud.define('cronjobGetActiveTicket', (req, res) => {
  let date = req.params.date && new Date(req.params.date) || moment().subtract(1, 'days').toDate()
  const start = moment(date).startOf('day').toDate()
  const end = moment(date).endOf('day').toDate()
  return getActiveTicket(start, end)
  .then((data) => {
    return new AV.Query('Stats')
    .equalTo('type', 'activeTicket')
    .equalTo('date', start)
    .destroyAll({useMasterKey: true})
    .then((datas) => {
      return new AV.Object('Stats')
      .setACL(getStatsAcl())
      .save({
        type: 'activeTicket',
        date: start,
        data,
      }, {useMasterKey: true})
    })
  })
  .then(res.success)
  .catch(res.error)
})

const getActiveTicket = (start, end) => {
  const query = new AV.Query('Reply')
  .greaterThanOrEqualTo('createdAt', start)
  .lessThan('createdAt', end)
  .include('ticket')
  .ascending('createdAt')
  return reduceAVObject(query, (result, reply) => {
    const ticket = reply.get('ticket')
    let ticketInfo = _.find(result.activeTickets, {objectId: ticket.id})
    if (!ticketInfo) {
      ticketInfo = {
        objectId: ticket.id,
        categoryId: ticket.get('category').objectId,
        authorId: ticket.get('author').id,
        assigneeId: ticket.get('assignee').id,
        status: ticket.get('status'),
        joinedCustomerServiceIds: _.map(ticket.get('joinedCustomerServices'), 'objectId'),
        replyCount: 0
      }
      result.activeTickets.push(ticketInfo)
    }
    ticketInfo.replyCount++
    return result
  }, {
    activeTickets: [],
  })
  .then(({activeTickets}) => {
    return {
      ticketCount: activeTickets.length,
      replyCount: _.sumBy(activeTickets, ticket => ticket.replyCount),
      category: _.countBy(activeTickets, 'categoryId'),
      assignee: _.countBy(activeTickets, 'assigneeId'),
      author: _.countBy(activeTickets, 'authorId'),
      status: _.countBy(activeTickets, 'status'),
      joinedCustomerService: _.chain(activeTickets)
        .map('joinedCustomerServiceIds')
        .flatten()
        .countBy()
        .value(),
    }
  })
  .catch(console.error)
}

const reduceAVObject = (query, fn, accumulator) => {
  query.limit(1000)
  const innerFn = () => {
    return query.find()
    .then((datas) => {
      _.forEach(datas, (data) => {
        accumulator = fn(accumulator, data)
      })
      if (datas.length !== 1000) {
        return accumulator
      } else {
        query.greaterThan('createdAt', _.last(datas).get('createdAt'))
        return innerFn()
      }
    })
  }
  return innerFn()
}

const getStatsAcl = () => {
  const acl = new AV.ACL()
  acl.setRoleReadAccess(new AV.Role('customerService'), true)
  return acl
}
