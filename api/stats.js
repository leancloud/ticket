const Promise = require('bluebird')
const _ = require('lodash')
const moment = require('moment')
const AV = require('leanengine')
const throat = require('throat').default

const forEachAVObject = require('./common').forEachAVObject

const { TICKET_STATUS, TICKET_OPENED_STATUSES } = require('../lib/common')
const { isStaff } = require('./common')

AV.Cloud.define('statsOpenedTicket', (req, res) => {
  res.success()
  forEachAVObject(
    new AV.Query('Ticket').containedIn('status', TICKET_OPENED_STATUSES),
    (ticket) => {
      return AV.Cloud.run('statsTicket', { ticketId: ticket.id }).catch((err) => {
        console.log('err >>', ticket.id, err)
      })
    },
    { useMasterKey: true }
  )
})

AV.Cloud.define('statsTicket', (req, res) => {
  const ticketId = req.params.ticketId
  const authOptions = { useMasterKey: true }
  exports
    .statsTicket(ticketId, authOptions)
    .then((data) => {
      return removeTicketStats(data.ticket, authOptions).then(() => {
        return new AV.Object('StatsTicket').setACL(getStatsAcl()).save(data, authOptions)
      })
    })
    .then(res.success)
    .catch(res.error)
})

AV.Cloud.define('getStatsTicketByUser', (req) => {
  let { userId, start, end } = req.params
  return getDailyAndTicketStatses(start, end, { user: req.currentUser }).then(
    ({ ticketStatses }) => {
      return _.filter(ticketStatses, (stats) => {
        if (_.find(stats.get('replyTimeStats'), { userId })) {
          return true
        }
        if (_.find(stats.get('firstReplyStats'), { userId })) {
          return true
        }
        return false
      })
    }
  )
})

const removeTicketStats = (ticket, authOptions) => {
  return new AV.Query('StatsTicket').equalTo('ticket', ticket).destroyAll(authOptions)
}

exports.statsTicket = (ticketId, authOptions) => {
  return getTicketAndTimeline(ticketId, authOptions).then(({ ticket, timeline }) => {
    const firstReplyStats = new FirstReplyStats(ticket)
    const replyTimeStats = new ReplyTimeStats(ticket)
    _.forEach(timeline, (replyOrOpsLog) => {
      firstReplyStats.forEachReplyOrOpsLog(replyOrOpsLog)
      replyTimeStats.forEachReplyOrOpsLog(replyOrOpsLog)
    })
    return {
      ticket,
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
    if (avObj.className === 'Reply' && avObj.get('isCustomerService')) {
      this.firstReplyAt = avObj.createdAt
      this.userId = avObj.get('author').id
      return
    }
    if (avObj.className === 'OpsLog' && avObj.get('action') === 'selectAssignee') {
      this.customerService = avObj.get('data').assignee
      return
    }
    if (avObj.className === 'OpsLog' && avObj.get('action') === 'changeAssignee') {
      this.firstReplyAt = avObj.createdAt
      if (this.customerService) {
        this.userId = this.customerService.objectId
      }
      return
    }
  }

  result() {
    return {
      ticketId: this.ticketId,
      userId: this.userId,
      firstReplyTime: this.firstReplyAt - this.start,
    }
  }
}

class ReplyTimeStats {
  constructor(ticket) {
    this.ticket = ticket
    this.cursor = ticket.createdAt
    this.customerServiceTimes = []
    this.lastCustomerService = ticket.get('assignee')
    this.lastAction = null
    this.isReply = false
  }

  getCustomerServiceTime(user) {
    const userId = user.id || user.objectId
    let result = _.find(this.customerServiceTimes, { userId })
    if (!result) {
      result = { ticketId: this.ticket.id, userId, replyCount: 0, replyTime: 0 }
      this.customerServiceTimes.push(result)
    }
    return result
  }

  forEachReplyOrOpsLog(avObj) {
    this.lastAction = avObj
    if (avObj.className === 'Reply' && avObj.get('isCustomerService') && !this.isReply) {
      // 客服在用户之后回复
      const customerServiceTime = this.getCustomerServiceTime(avObj.get('author'))
      customerServiceTime.replyCount++
      customerServiceTime.replyTime += avObj.createdAt - this.cursor
      this.cursor = avObj.createdAt
      this.isReply = true
      this.lastCustomerService = avObj.get('author')
      return
    }
    if (avObj.className === 'Reply' && !avObj.get('isCustomerService') && this.isReply) {
      // 用户在客服之后回复
      this.cursor = avObj.createdAt
      this.isReply = false
      return
    }
    if (avObj.className === 'OpsLog' && avObj.get('action') === 'selectAssignee') {
      this.lastCustomerService = avObj.get('data').assignee
      return
    }
    if (avObj.className === 'OpsLog' && avObj.get('action') === 'changeAssignee' && !this.isReply) {
      if (this.lastCustomerService) {
        const customerServiceTime = this.getCustomerServiceTime(this.lastCustomerService)
        customerServiceTime.replyCount++
        customerServiceTime.replyTime += avObj.createdAt - this.cursor
      }
      this.cursor = avObj.createdAt
      this.lastCustomerService = avObj.get('data').assignee
      return
    }
    if (
      avObj.className === 'OpsLog' &&
      (avObj.get('action') === 'replyWithNoContent' || avObj.get('action') === 'replySoon') &&
      !this.isReply
    ) {
      if (this.lastCustomerService) {
        const customerServiceTime = this.getCustomerServiceTime(this.lastCustomerService)
        customerServiceTime.replyCount++
        customerServiceTime.replyTime += avObj.createdAt - this.cursor
      }
      this.cursor = avObj.createdAt
      this.isReply = true
      this.lastCustomerService = avObj.get('data').operator
      return
    }
    if (
      avObj.className === 'OpsLog' &&
      avObj.get('action') === 'reopen' &&
      !!this.ticket
        .get('joinedCustomerServices')
        ?.find(({ objectId }) => objectId === avObj.get('data').operator.objectId)
    ) {
      this.cursor = avObj.createdAt
      this.isReply = true
      this.lastCustomerService = avObj.get('data').operator
      return
    }
  }

  result() {
    if (
      !this.isReply &&
      (this.ticket.get('status') === TICKET_STATUS.NEW ||
        (this.ticket.get('status') === TICKET_STATUS.WAITING_CUSTOMER_SERVICE &&
          this.lastAction &&
          this.lastAction.className === 'OpsLog' &&
          this.lastAction.get('action') !== 'replySoon')) &&
      this.lastCustomerService
    ) {
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
      .notEqualTo('internal', true)
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
      })
      .value()
    return { ticket, timeline }
  })
}

AV.Cloud.define('getNewTicketCount', (req) => {
  let { start, end, timeUnit } = req.params
  if (typeof start === 'string') {
    start = new Date(start)
  }
  if (typeof end === 'string') {
    end = new Date(end)
  }
  const dateRanges = getDateRanges(start, end, timeUnit)
  return Promise.map(
    dateRanges,
    ({ start, end }) => {
      return new AV.Query('Ticket')
        .greaterThanOrEqualTo('createdAt', start)
        .lessThan('createdAt', end)
        .count({ user: req.currentUser })
        .then((count) => {
          return {
            date: start.toISOString(),
            count,
          }
        })
    },
    { concurrency: 3 }
  )
})

const sumProperty = (obj, other, property) => {
  return _.mergeWith(obj[property], other.get(property), (a = 0, b) => a + b)
}

AV.Cloud.define('getStats', async (req) => {
  if (!(await isStaff(req.currentUser))) {
    throw new AV.Cloud.Error('Forbidden', { status: 403 })
  }
  let { start, end, timeUnit } = req.params
  if (typeof start === 'string') {
    start = new Date(start)
  }
  if (typeof end === 'string') {
    end = new Date(end)
  }
  const dateRanges = getDateRanges(start, end, timeUnit)
  return Promise.map(dateRanges, async ({ start, end }) => {
    const { dailyStatses, ticketStatses, tags } = await getDailyAndTicketStatses(start, end, {
      useMasterKey: true,
    })

    const result = _.reduce(
      dailyStatses,
      (result, statsDaily) => {
        result.assignees = sumProperty(result, statsDaily, 'assignees')
        result.authors = sumProperty(result, statsDaily, 'authors')
        result.categories = sumProperty(result, statsDaily, 'categories')
        result.joinedCustomerServices = sumProperty(result, statsDaily, 'joinedCustomerServices')
        result.statuses = sumProperty(result, statsDaily, 'statuses')
        result.replyCount += statsDaily.get('replyCount')
        result.tickets = _.union(result.tickets, statsDaily.get('tickets'))
        return result
      },
      {
        date: start.toISOString(),
        assignees: {},
        authors: {},
        categories: {},
        joinedCustomerServices: {},
        statuses: {},
        replyCount: 0,
        tickets: [],
      }
    )

    const newTicketStatses = ticketStatses.filter((ticketStats) => {
      const ticket = ticketStats.get('ticket')
      return ticket.createdAt >= start && ticket.createdAt < end
    })
    const workdayNewTicketStatses = newTicketStatses.filter((ticketStats) => {
      const ticket = ticketStats.get('ticket')
      const createDay = ticket.createdAt.getDay()
      return createDay >= 1 && createDay <= 5
    })

    const workdayFirstReplyTime = workdayNewTicketStatses.reduce(
      (sum, ticketStats) => sum + ticketStats.get('firstReplyStats').firstReplyTime,
      0
    )

    result.firstReplyTimeByUser = firstReplyTimeByUser(newTicketStatses)
    result.replyTimeByUser = replyTimeByUser(ticketStatses)
    result.firstReplyTime = _.sumBy(result.firstReplyTimeByUser, 'replyTime')
    result.firstReplyCount = _.sumBy(result.firstReplyTimeByUser, 'replyCount')
    result.workdayFirstReplyTime = workdayFirstReplyTime
    result.workdayFirstReplyCount = workdayNewTicketStatses.length
    result.replyTime = _.sumBy(result.replyTimeByUser, 'replyTime')
    result.replyCount = _.sumBy(result.replyTimeByUser, 'replyCount')
    result.tags = _.countBy(tags, (t) => JSON.stringify(t))
    return result
  })
})

const getDateRanges = (start, end, timeUnit) => {
  const result = []
  let tStart = moment(start)
  let tEnd
  do {
    tEnd = tStart.clone().add(1, timeUnit)
    if (tEnd > end) {
      tEnd = moment(end)
    }
    result.push({ start: tStart.toDate(), end: tEnd.toDate() })
    tStart = tEnd.clone()
  } while (tEnd < end)
  return result
}

const getDailyAndTicketStatses = (start, end, authOptions) => {
  if (typeof start === 'string') {
    start = new Date(start)
  }
  if (typeof end === 'string') {
    end = new Date(end)
  }
  return new AV.Query('StatsDaily')
    .greaterThanOrEqualTo('date', start)
    .lessThan('date', end)
    .ascending('date')
    .limit(1000)
    .find(authOptions)
    .then((dailyStatses) => {
      const ticketIds = _.chain(dailyStatses)
        .map((stats) => stats.get('tickets'))
        .flatten()
        .uniq()
        .value()
      return Promise.all([
        getTicketStats(ticketIds, authOptions),
        getTagStats(ticketIds, authOptions),
      ]).then(([ticketStatses, tags]) => {
        return { dailyStatses, ticketStatses, tags }
      })
    })
}

const getTicketStats = async (ticketIds, authOptions) => {
  const run = throat(2)
  const ticketStatsesChunk = await Promise.all(
    _.map(_.chunk(ticketIds, 50), (ids) => {
      const task = () => {
        return new AV.Query('StatsTicket')
          .containedIn(
            'ticket',
            ids.map((id) => new AV.Object.createWithoutData('Ticket', id))
          )
          .include('ticket')
          .find(authOptions)
      }
      return run(task)
    })
  )
  return _.flatten(ticketStatsesChunk).filter((ticketStats) => {
    const { ticketId, userId, firstReplyTime } = ticketStats.get('firstReplyStats')
    return ticketId && userId && firstReplyTime !== undefined
  })
}

const getTagStats = (ticketIds, authOptions) => {
  const run = throat(2)
  return Promise.all(
    _.map(_.chunk(ticketIds, 50), (ids) => {
      const task = () => {
        return new AV.Query('Ticket')
          .select(['privateTags', 'tags'])
          .containedIn('objectId', ids)
          .find(authOptions)
      }
      return run(task)
    })
  )
    .then(_.flatten)
    .then((tickets) => {
      return tickets.map((t) => {
        return [t.get('privateTags'), t.get('tags')]
      })
    })
    .then(_.flattenDeep)
    .then(_.compact)
    .then((tags) => {
      return getSelectedTagKeys(authOptions).then((keys) => {
        return tags.filter((t) => keys.includes(t.key))
      })
    })
}

const getSelectedTagKeys = (authOptions) => {
  return new AV.Query('TagMetadata')
    .limit(1000)
    .find(authOptions)
    .then((tagMetadatas) => {
      return tagMetadatas.filter((m) => m.get('type') === 'select').map((m) => m.get('key'))
    })
}

const firstReplyTimeByUser = (ticketStatses) => {
  return _.chain(ticketStatses)
    .groupBy((ticketStats) => ticketStats.get('firstReplyStats').userId)
    .map((ticketStatses, userId) => {
      return {
        userId,
        replyTime: _.sumBy(
          ticketStatses,
          (ticketStats) => ticketStats.get('firstReplyStats').firstReplyTime
        ),
        replyCount: ticketStatses.length,
      }
    })
    .value()
}

const replyTimeByUser = (ticketStatses) => {
  return _.chain(ticketStatses)
    .reduce((result, ticketStats) => {
      _.forEach(ticketStats.get('replyTimeStats'), (replyTime) => {
        let replyTimeStats = _.find(result, { userId: replyTime.userId })
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

AV.Cloud.define('statsDaily', (req, res) => {
  let date = (req.params.date && new Date(req.params.date)) || moment().subtract(1, 'days').toDate()
  const start = moment(date).startOf('day').toDate()
  const end = moment(date).endOf('day').toDate()
  const authOptions = { useMasterKey: true }
  return getActiveTicket(start, end, authOptions)
    .then((data) => {
      return removeDailyStats(start, authOptions).then(() => {
        data.date = start
        return new AV.Object('StatsDaily').setACL(getStatsAcl()).save(data, authOptions)
      })
    })
    .then(res.success)
    .catch(res.error)
})

const removeDailyStats = (date, authOptions) => {
  return new AV.Query('StatsDaily').equalTo('date', date).destroyAll(authOptions)
}

const getActiveTicket = (start, end, authOptions) => {
  const query = new AV.Query('Reply')
    .notEqualTo('internal', true)
    .greaterThanOrEqualTo('createdAt', start)
    .lessThan('createdAt', end)
    .include('ticket')
  return reduceAVObject(
    query,
    (result, reply) => {
      const ticket = reply.get('ticket')
      let ticketInfo = _.find(result.activeTickets, { objectId: ticket.id })
      if (!ticketInfo) {
        ticketInfo = {
          objectId: ticket.id,
          categoryId: ticket.get('category').objectId,
          authorId: ticket.get('author').id,
          assigneeId: ticket.get('assignee')?.id,
          status: ticket.get('status'),
          joinedCustomerServiceIds: _.map(ticket.get('joinedCustomerServices'), 'objectId'),
          replyCount: 0,
        }
        result.activeTickets.push(ticketInfo)
      }
      ticketInfo.replyCount++
      return result
    },
    {
      activeTickets: [],
    },
    authOptions
  ).then(({ activeTickets }) => {
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
}

const reduceAVObject = (query, fn, accumulator, authOptions) => {
  query.limit(1000).ascending('createdAt')
  const innerFn = () => {
    return query.find(authOptions).then((datas) => {
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
