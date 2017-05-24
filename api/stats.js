const Promise = require('bluebird')
const _ = require('lodash')
const moment = require('moment')
const AV = require('leancloud-storage')
const leanengine = require('leanengine')

const TICKET_STATUS = require('../lib/constant').TICKET_STATUS

leanengine.Cloud.define('yy', (req, res) => {
  res.success()
  forEachAVObject(new AV.Query('Ticket'), (ticket) => {
    return AV.Cloud.run('statsTicket', {ticketId: ticket.id})
    .catch((err) => {
      console.log('err >>', ticket.id, err)
    })
  }, {useMasterKey: true})
})

leanengine.Cloud.define('statsTicket', (req, res) => {
  const ticketId = req.params.ticketId
  console.log('statsTicket:', ticketId)
  const authOptions = {useMasterKey: true}
  exports.statsTicket(ticketId, authOptions)
  .then((data) => {
    return removeTicketStats(data.ticketId)
    .then(() => {
      return new AV.Object('Stats')
      .setACL(getStatsAcl())
      .save({
        type: 'ticketStats',
        data,
      }, authOptions)
    })
  })
  .then(res.success)
  .catch(res.error)
})

const removeTicketStats = (ticketId, authOptions) => {
  return new AV.Query('Stats')
  .equalTo('type', 'ticketStats')
  .equalTo('data.ticketId', ticketId)
  .destroyAll(authOptions)
}

exports.statsTicket = (ticketId, authOptions) => {
  return getTicketAndTimeline(ticketId, authOptions)
  .then(({ticket, timeline}) => {
    const firstReplyStats = new FirstReplyStats(ticket) 
    const replyTimeStats = new ReplyTimeStats(ticket) 
    _.forEach(timeline, (replyOrOpsLog) => {
      firstReplyStats.forEachReplyOrOpsLog(replyOrOpsLog)
      replyTimeStats.forEachReplyOrOpsLog(replyOrOpsLog)
    })
    return {
      ticketId: ticketId,
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
    this.ticket = ticket
    this.cursor = ticket.createdAt
    this.customerServiceTimes = []
    this.lastCustomerService = ticket.get('assignee')
    this.isReply = false
  }

  getCustomerServiceTime(user) {
    const userId = user.id || user.objectId
    let result = _.find(this.customerServiceTimes, {userId})
    if (!result) {
      result= {ticketId: this.ticket.id, userId, replyCount:0, replyTime: 0}
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
    if (!this.isReply
        && (this.ticket.get('status') === TICKET_STATUS.NEW
          || this.ticket.get('status') === TICKET_STATUS.PENDING)) {
      const customerServiceTime = this.getCustomerServiceTime(this.lastCustomerService)
      customerServiceTime.replyTime += new Date() - this.cursor
    }
    return this.customerServiceTimes
  }
}

const getTicketAndTimeline = (ticketObjectId, authOptions) => {
  const ticket = AV.Object.createWithoutData('Ticket', ticketObjectId)
  return Promise.all([
    ticket.fetch({}, authOptions),
    new AV.Query('Reply')
      .equalTo('ticket', ticket)
      .limit(1000)
      .ascending('createdAt')
      .find(authOptions),
    new AV.Query('OpsLog')
      .equalTo('ticket', ticket)
      .limit(1000)
      .ascending('createdAt')
      .find(authOptions),
  ]).spread((ticket, replies, opsLogs) => {
    if (!ticket) {
      throw new Error('ticket is not exist: ' + ticketObjectId)
    }
    const timeline = _.chain(replies)
    .concat(opsLogs)
    .sortBy((data) => {
      return data.get('createdAt')
    }).value()
    return {ticket, timeline}
  })
}

leanengine.Cloud.define('getNewTicketCount', (req) => {
  let {start, end, timeUnit} = req.params
  if (typeof start === 'string') {
    start = new Date(start)
  }
  if (typeof end === 'string') {
    end = new Date(end)
  }
  const queryCount = (start, end) => {
    return new AV.Query('Ticket')
    .greaterThanOrEqualTo('createdAt', start)
    .lessThanOrEqualTo('createdAt', end)
    .count()
    .then((count) => {
      return {
        date: moment(start).startOf('week').toISOString(),
        count
      }
    })
  }
  let tStart = moment(start)
  let tEnd = moment(start).endOf(timeUnit)
  const promises = []
  do {
    promises.push(queryCount(tStart.toDate(), tEnd.toDate()))
    tEnd.add(1, 'week')
    if (tEnd > end) {
      tEnd = moment(end)
    }
    tStart.add(1, 'week').startOf('week')
  } while (tEnd < end)
  return Promise.all(promises)
})

const sumProperty = (obj, other, property) => {
  return _.mergeWith(obj[property], other[property], (a = 0, b) => a + b)
}

leanengine.Cloud.define('getStats', (req) => {
  let {start, end, timeUnit} = req.params
  if (typeof start === 'string') {
    start = new Date(start)
  }
  if (typeof end === 'string') {
    end = new Date(end)
  }
  let statses, ticketStatses
  return new AV.Query('Stats')
  .equalTo('type', 'dailyStats')
  .greaterThanOrEqualTo('data.date', start)
  .lessThanOrEqualTo('data.date', end)
  .ascending('data.date')
  .limit(1000)
  .find({user: req.currentUser})
  .then((_statses) => {
    statses = _statses
    return getTicketStats(statses)
    .then((_ticketStatses) => {
      ticketStatses = _ticketStatses
    })
  })
  .then(() => {
    return _.chain(statses)
    .groupBy((stats) => {
      return moment(stats.get('data').date).startOf(timeUnit).format()
    })
    .map((statses, date) => {
      return _.reduce(statses, (result, stats) => {
        const src = stats.get('data')
        result.assignees = sumProperty(result, src, 'assignees')
        result.authors = sumProperty(result, src, 'authors')
        result.categories = sumProperty(result, src, 'categories')
        result.joinedCustomerServices = sumProperty(result, src, 'joinedCustomerServices')
        result.statuses = sumProperty(result, src, 'statuses')
        result.replyCount += src.replyCount
        result.tickets = _.union(result.tickets, src.tickets)
        return result
      }, {
        date: new Date(date).toISOString(),
        assignees: {},
        authors: {},
        categories: {},
        joinedCustomerServices: {},
        statuses: {},
        replyCount: 0,
        tickets: [],
      })
    })
    .forEach((stats) => {
      stats.firstReplyTimeByUser = firstReplyTimeByUser(stats, ticketStatses)
      stats.replyTimeByUser = replyTimeByUser(stats, ticketStatses)
    })
    .value()
  })
})

const getTicketStats = (statses) => {
  const ticketIds = _.chain(statses)
  .map(stats => stats.get('data').tickets)
  .flatten()
  .uniq()
  .value()
  return Promise.all(_.map(_.chunk(ticketIds, 50), (ids) => {
    return new AV.Query('Stats')
    .equalTo('type', 'ticketStats')
    .containedIn('data.ticketId', ids)
    .find()
  }))
  .then(_.flatten)
}

const firstReplyTimeByUser = (stats, ticketStatses) => {
  return _.chain(stats.tickets)
  .map((ticketId) => {
    return _.find(ticketStatses, ticketStats => ticketStats.get('data').ticketId === ticketId)
  })
  .groupBy(ticketStats => ticketStats.get('data').firstReplyStats.userId)
  .map((ticketStatses, userId) => {
    return {
      userId,
      replyTime: _.sumBy(ticketStatses, ticketStats => ticketStats.get('data').firstReplyStats.firstReplyTime),
      replyCount: ticketStatses.length
    }
  })
  .value()
}

const replyTimeByUser = (stats, ticketStatses) => {
  return _.chain(stats.tickets)
  .map((ticketId) => {
    return _.find(ticketStatses, ticketStats => ticketStats.get('data').ticketId === ticketId)
  })
  .reduce((result, ticketStats) => {
    _.forEach(ticketStats.get('data').replyTimeStats, (replyTime) => {
      let replyTimeStats = _.find(result, {userId: replyTime.userId})
      if (!replyTimeStats) {
        replyTimeStats = {
          userId: replyTime.userId,
          replyCount: 0,
          replyTime: 0,
        }
        result.push(replyTimeStats)
      }
      replyTimeStats.replyCount += replyTime.replyCount
      replyTimeStats.replyTime += replyTime.replyTime
    })
    return result
  }, [])
  .value()
}

leanengine.Cloud.define('xx', (req, res) => {
  res.success()
  const fn = (date) => {
    return AV.Cloud.run('statsDaily', {date: date.format('YYYY-MM-DD')})
    .then(() => {
      return fn(date.subtract(1, 'days'))
    })
    .catch(console.error)
  }
  fn(moment('2017-04-01'))
})

leanengine.Cloud.define('statsDaily', (req, res) => {
  let date = req.params.date && new Date(req.params.date) || moment().subtract(1, 'days').toDate()
  const start = moment(date).startOf('day').toDate()
  const end = moment(date).endOf('day').toDate()
  const authOptions = {useMasterKey: true}
  return getActiveTicket(start, end, authOptions)
  .then((data) => {
    return removeDailyStats(start, authOptions)
    .then(() => {
      data.date = start
      return new AV.Object('Stats')
      .setACL(getStatsAcl())
      .save({
        type: 'dailyStats',
        data,
      }, authOptions)
    })
  })
  .then(res.success)
  .catch(res.error)
})

const removeDailyStats = (date, authOptions) => {
  return new AV.Query('Stats')
  .equalTo('type', 'dailyStats')
  .equalTo('data.date', date)
  .destroyAll(authOptions)
}

const getActiveTicket = (start, end, authOptions) => {
  const query = new AV.Query('Reply')
  .greaterThanOrEqualTo('createdAt', start)
  .lessThan('createdAt', end)
  .include('ticket')
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
  }, authOptions)
  .then(({activeTickets}) => {
    return {
      tickets: _.map(activeTickets, 'objectId'),
      replyCount: _.sumBy(activeTickets, 'replyCount'),
      categories: _.countBy(activeTickets, 'categoryId'),
      assignees: _.countBy(activeTickets, 'assigneeId'),
      authors: _.countBy(activeTickets, 'authorId'),
      statuses: _.countBy(activeTickets, 'status'),
      joinedCustomerServices: _.chain(activeTickets)
        .map('joinedCustomerServiceIds')
        .flatten()
        .countBy()
        .value(),
    }
  })
  .catch(console.error)
}

const reduceAVObject = (query, fn, accumulator, authOptions) => {
  query.limit(1000)
  .ascending('createdAt')
  const innerFn = () => {
    return query.find(authOptions)
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

const forEachAVObject = (query, fn, authOptions) => {
  query.limit(1000)
  .descending('createdAt')
  const innerFn = () => {
    return query.find(authOptions)
    .then((datas) => {
      return Promise.each(datas, fn)
      .then(() => {
        if (datas.length !== 1000) {
          return
        } else {
          query.lessThan('createdAt', _.last(datas).get('createdAt'))
          return innerFn()
        }
      })
    })
  }
  return innerFn()
}

const getStatsAcl = () => {
  const acl = new AV.ACL()
  acl.setRoleReadAccess(new AV.Role('customerService'), true)
  return acl
}
