/**
 * 1. 根据时间范围 获取活跃工单 id (新建 有回复 部分 action)
 * 2. 根据 id 获取工单时间线
 * 3. 根据时间线提取统计数据
 */
import _ from 'lodash';
import throat from 'throat';
import { isBefore, differenceInSeconds, set, isWithinInterval, format, isAfter, getDay, Day, startOfHour, endOfHour, subHours, addDays, isSameDay } from 'date-fns';
import { CreateData } from '@/orm';
import { Status, Ticket } from '@/model/Ticket';
import { Reply } from '@/model/Reply';
import { OpsLog, Action as LogAction } from '@/model/OpsLog';
import { TicketStats } from '@/model/TicketStats';
import { TicketStatusStats } from '@/model/TicketStatusStats';
import { Config } from '@/config';
type WeekdayDuration = Record<'hours' | 'minutes' | 'seconds', number>;
const WEEKDAY_CONFIG = {
  workTime: 0,
  days: [] as Day[],
  from: {
    hours: 0,
    minutes: 0,
    seconds: 0
  } as WeekdayDuration,
  to: {
    hours: 19,
    minutes: 59,
    seconds: 59
  } as WeekdayDuration
}
const AUTH_OPTIONS = { useMasterKey: true };
const RESPONSE_ACTIONS: LogAction[] = [
  'replyWithNoContent', // 视为一个 reply
  'changeAssignee',
  'selectAssignee',
  'reopen',
  'resolve',
  'close',
];
const SEPARATOR = '__';
// 受理中	某时间段内分配到该客服的受理中的工单数	
// 1、可以用「视图」解决
// 2、结束时间点之前工单的状态
// 等待回复

type TimeLine = Array<Reply | OpsLog>
interface ReplyDetail {
  replyTime?: number; // 工单角度回复时间
  authorReplyTime?: number;  // 客服角度回复时间
  naturalReplyTime?: number; // 用户角度回复时间
  first?: boolean;
  internal: boolean;
  authorId: string;
}

interface StatData {
  created: number;
  closed: number;
  reopened: number;
  conversion: number;
  internalConversion: number;
  externalConversion: number;
  replyTime: number;
  replyTimeCount: number; // 有回复时间的回复
  replyCount: number; // 
  naturalReplyTime: number;
  naturalReplyCount: number;
  firstReplyTime: number;
  firstReplyCount: number;
  internalReplyCount: number;
}

interface StatResult {
  ticket?: StatData;
  customerService: {
    [key in string]: StatData
  };
  category: {
    [key in string]: StatData
  };
  customerServiceCategory: {
    [key in string]: StatData
  }
}
interface CurrentStatus {
  accepted: Array<[string | undefined, string]>,
  waiting: Array<[string | undefined, string]>
}

const isOpsLog = (obj: Reply | OpsLog): obj is OpsLog => 'action' in obj
const getReplyOrOpsLogType = (replyOrOpsLog: OpsLog | Reply, ticketAuthorId: string) => {
  if (isOpsLog(replyOrOpsLog)) {
    const { data } = replyOrOpsLog;
    if (!data.operator || !data.operator.objectId || data.operator.objectId === 'system') {
      return 'system'
    }
    return data.operator.objectId === ticketAuthorId ? 'staff' : 'customerService'
  } else {
    return replyOrOpsLog.authorId === ticketAuthorId ? 'staff' : 'customerService'
  }
}
const getRelyTime = (replyDate: Date, askDate: Date) => {
  let time = 0;
  if (WEEKDAY_CONFIG.days.includes(getDay(askDate))) {
    const from = set(askDate, WEEKDAY_CONFIG.from)
    const to = set(askDate, WEEKDAY_CONFIG.to)
    if (isBefore(askDate, from)) {
      time = WEEKDAY_CONFIG.workTime;
    } else if (isAfter(askDate, to)) {
      time = 0;
    } else {
      time = differenceInSeconds(to, askDate)
    }
  }
  while (!isSameDay(replyDate, askDate)) {
    askDate = addDays(askDate, 1)
    if (WEEKDAY_CONFIG.days.includes(getDay(askDate))) {
      time = time + WEEKDAY_CONFIG.workTime
    }
  }

  if (WEEKDAY_CONFIG.days.includes(getDay(replyDate))) {
    const replyFrom = set(replyDate, WEEKDAY_CONFIG.from)
    const replyTo = set(replyDate, WEEKDAY_CONFIG.to)
    if (isBefore(replyDate, replyFrom)) {
      time = time - WEEKDAY_CONFIG.workTime;
    } else {
      if (isBefore(replyDate, replyTo)) {
        time = time - differenceInSeconds(replyTo, replyDate)
      }
    }
  }
  return time
}
const customizer = (objValue?: number, srcValue = 0) => objValue === undefined ? srcValue : objValue + srcValue
const mergeStatData = (target: StatResult, source: Pick<StatResult, 'customerService' | 'ticket'> & { categoryId: string }) => {
  const newCustomerServiceCategory = Object.keys(source.customerService).reduce((pre, curr) => {
    const key = [curr, source.categoryId].join(SEPARATOR);
    pre[key] = source.customerService[curr];
    return pre
  }, {} as StatResult['customerServiceCategory'])
  return {
    ticket: _.mergeWith({ ...target.ticket }, source.ticket, customizer),
    customerService: _.mergeWith({ ...target.customerService }, source.customerService, (objValue, srcValue) => {
      if (!objValue) {
        return srcValue
      }
      return _.mergeWith({ ...objValue }, srcValue, customizer)
    }),
    category: {
      ...target.category,
      [source.categoryId]: _.mergeWith({ ...target.category[source.categoryId] }, source.ticket, customizer)
    },
    customerServiceCategory: _.mergeWith({ ...target.customerServiceCategory }, newCustomerServiceCategory, (objValue, srcValue) => {
      if (!objValue) {
        return srcValue
      }
      return _.mergeWith({ ...objValue }, srcValue, customizer)
    })
  }
}

const _getNewTicketIds = async (from: Date, to: Date, limit = 100, skip = 0): Promise<string[]> => {
  try {
    const ticketList = await Ticket.queryBuilder()
      .where('createdAt', '>=', from)
      .where('createdAt', '<=', to)
      .limit(limit)
      .skip(skip)
      .find(AUTH_OPTIONS);

    const ids = ticketList.map((ticket) => ticket.id);
    if (ticketList.length === limit) {
      const nextIds = await _getNewTicketIds(from, to, limit, skip + limit);
      return [...ids, ...nextIds];
    }
    return ids;
  } catch (error) {
    console.log('getNewTicketIds Error', { from, to, limit, skip }, error);
    throw Error
  }
}
const _getReplyTicketIds = async (from: Date, to: Date, limit = 100, skip = 0): Promise<string[]> => {
  try {
    const replyList = await Reply.queryBuilder()
      .where('createdAt', '>=', from)
      .where('createdAt', '<=', to)
      .limit(limit)
      .skip(skip)
      .find(AUTH_OPTIONS);
    const ids = _.uniq(replyList.map((reply) => reply.ticketId));
    if (replyList.length === limit) {
      const nextIds = await _getReplyTicketIds(from, to, limit, skip + limit);
      return _.uniq([...ids, ...nextIds]);
    }
    return ids;
  } catch (error) {
    console.log('getReplyTicketIds Error', { from, to, limit, skip }, error);
    throw Error
  }
}
const _getResponseTicketIds = async (
  from: Date,
  to: Date,
  limit = 100,
  skip = 0
): Promise<string[]> => {
  try {
    const opsLogs = await OpsLog.queryBuilder()
      .where('createdAt', '>=', from)
      .where('createdAt', '<=', to)
      .where('action', 'in', RESPONSE_ACTIONS)
      .limit(limit)
      .skip(skip)
      .find(AUTH_OPTIONS);
    const ids = _.uniq(opsLogs.map((log) => log.ticketId));
    if (opsLogs.length === limit) {
      const nextIds = await _getResponseTicketIds(from, to, limit, skip + limit);
      return _.uniq([...ids, ...nextIds]);
    }
    return ids;
  } catch (error) {
    console.log('getResponseTicketIds Error', { from, to, limit, skip }, error);
    throw Error
  }
}
const _getTicketReliesAndLogs = async (id: string, endDate: Date) => {
  const replies = Reply.queryBuilder()
    .where('createdAt', '<=', endDate)
    .where('ticket', '==', Ticket.ptr(id))
    .orderBy('createdAt')
    .find(AUTH_OPTIONS);
  const opsLogs = OpsLog.queryBuilder()
    .where('createdAt', '<=', endDate)
    .where('ticket', '==', Ticket.ptr(id))
    .orderBy('createdAt')
    .find(AUTH_OPTIONS);
  return await Promise.all([replies, opsLogs])
}

const _getAssigneeIds = (assigneeLogs: OpsLog[], from: Date) => {
  const [beforeLogs, logs] = _.partition(assigneeLogs, log => isBefore(log.createdAt, from))
  const preAssigneeIds: string[] = beforeLogs.map(log => log.data.assignee?.objectId)
  const assigneeIds: string[] = logs.map(log => log.data.assignee?.objectId)
  return [_.last(preAssigneeIds), ...assigneeIds].filter((assigneeId): assigneeId is string => !!assigneeId);
}
const _getReplyStat = (replies: ReplyDetail[], authorId?: string) => {
  replies = authorId ? replies.filter(v => v.authorId === authorId)
    .map(v => ({
      ...v,
      replyTime: v.authorReplyTime
    })) : replies;
  const hasReplyTimeReplies = replies.filter(v => v.replyTime && v.replyTime > 0)
  const firstReplies = replies.filter(v => v.first && v.replyTime && v.replyTime > 0)
  const userReplies = replies.filter(v => v.naturalReplyTime && v.naturalReplyTime > 0)
  const internalReplyCount = replies.filter(v => v.internal).length
  return {
    replyTime: _.sumBy(hasReplyTimeReplies, 'replyTime'),
    replyTimeCount: hasReplyTimeReplies.length, // 有回复时间的回复
    replyCount: replies.length - internalReplyCount,
    naturalReplyTime: _.sumBy(userReplies, 'naturalReplyTime'),
    naturalReplyCount: userReplies.length,
    firstReplyTime: _.sumBy(firstReplies, 'replyTime'),
    firstReplyCount: firstReplies.length,
    internalReplyCount,
  }
}
const _getConversions = (assigneeIds: string[], assigneeId?: string) => {
  if (!assigneeId) {
    return {
      conversion: assigneeIds.length - 1 > 0 ? assigneeIds.length - 1 : 0,
      internalConversion: assigneeIds.length - 1 > 0 ? assigneeIds.length - 1 : 0,// 暂时默认所有流转都是内部流转
      externalConversion: 0
    }
  }
  let conversion = assigneeIds.filter(v => v === assigneeId).length;
  if (_.last(assigneeIds) === assigneeId) {
    conversion = conversion - 1
  }
  return {
    conversion: conversion > 0 ? conversion : 0,
    internalConversion: conversion > 0 ? conversion : 0,// 暂时默认所有流转都是内部流转
    externalConversion: 0
  }
}
const _getReplyDetails = (allTimeLine: TimeLine, from: Date, ticket: Ticket) => {
  const [beforeTimeLine, timeLine] = _.partition(allTimeLine, (replyOrOpsLog) => isBefore(replyOrOpsLog.createdAt, from))
  if (timeLine.length === 0) {
    return [];
  }
  const details: ReplyDetail[] = [];
  const cursor = _getCursor(beforeTimeLine, ticket);
  const isFirst = _isFirstReplyFunc(beforeTimeLine, ticket)
  timeLine.forEach((replyOrOpsLog) => {
    if (isOpsLog(replyOrOpsLog)) {
      switch (replyOrOpsLog.action) {
        case 'selectAssignee':
        case 'changeAssignee':
          cursor.lastAssigneeId = replyOrOpsLog.data?.assignee?.objectId;
          cursor.lastAssigneeDate = replyOrOpsLog.createdAt;
          break;
        // 算作回复
        case 'reopen':
          if (getReplyOrOpsLogType(replyOrOpsLog, ticket.authorId) === 'staff') {
            cursor.lastReplyType = 'staff';
            cursor.lastStaffReplyDate = replyOrOpsLog.createdAt;
          }
          break;
        default:
          break;
      }
      return;
    }
    const type = getReplyOrOpsLogType(replyOrOpsLog, ticket.authorId);
    if (type === 'customerService') {
      const internal = !!replyOrOpsLog.internal;
      if (internal || cursor.lastReplyType === 'customerService') {
        // 内部回复或者连续回复只记录次数
        details.push({
          internal,
          authorId: replyOrOpsLog.authorId,
        })
        return;
      }
      const replyTime = getRelyTime(replyOrOpsLog.createdAt, cursor.lastStaffReplyDate)
      //  differenceInSeconds(replyOrOpsLog.createdAt, getWeekdayDate(cursor.lastStaffReplyDate));
      let authorReplyTime = replyTime;
      if (cursor.lastAssigneeDate && cursor.lastAssigneeId === replyOrOpsLog.authorId && isAfter(cursor.lastAssigneeDate, cursor.lastStaffReplyDate)) {
        getRelyTime(replyOrOpsLog.createdAt, cursor.lastAssigneeDate)
      }
      details.push({
        replyTime,
        naturalReplyTime: differenceInSeconds(replyOrOpsLog.createdAt, cursor.lastStaffReplyDate),
        authorReplyTime,
        internal,
        authorId: replyOrOpsLog.authorId,
        first: isFirst()
      })
      cursor.lastReplyType = 'customerService'
    }
    if (type === 'staff' && cursor.lastReplyType !== 'staff') {
      cursor.lastStaffReplyDate = replyOrOpsLog.createdAt
      cursor.lastReplyType = 'staff';
    }
  })
  return details;
}

const _getCursor = (timeLine: TimeLine, ticket: Ticket) => {
  const cursor = {
    lastAssigneeId: ticket.assigneeId,
    lastAssigneeDate: ticket.createdAt,
    lastStaffReplyDate: ticket.createdAt,
    lastReplyType: 'staff'
  }
  timeLine.forEach(v => {
    if (isOpsLog(v)) {
      switch (v.action) {
        case 'selectAssignee':
        case 'changeAssignee':
          cursor.lastAssigneeId = v.data?.assignee?.objectId;
          cursor.lastAssigneeDate = v.createdAt;
          break;
        // 算作回复
        case 'reopen':
          if (getReplyOrOpsLogType(v, ticket.authorId) === 'staff') {
            cursor.lastReplyType = 'staff';
            cursor.lastStaffReplyDate = v.createdAt;
          }
          break;
        default:
          break;
      }
    } else {
      if (getReplyOrOpsLogType(v, ticket.authorId) === 'staff') {
        cursor.lastReplyType = 'staff';
        cursor.lastStaffReplyDate = v.createdAt;
      } else {
        cursor.lastReplyType = 'customerService'
      }
    }
  })
  return cursor
}
const _isFirstReplyFunc = (beforeTimeLine: TimeLine, ticket: Ticket) => {
  let isHasReply = beforeTimeLine.some(replyOrOpsLog => getReplyOrOpsLogType(replyOrOpsLog, ticket.authorId) === 'customerService')
  return () => {
    if (isHasReply) {
      return false
    } else {
      isHasReply = true
      return true
    }
  }
}
const _getTicketStatById = async (id: string, from: Date, to: Date) => {
  const ticket = await Ticket.find(id, AUTH_OPTIONS);
  if (!ticket) {
    return;
  }
  const [replies, opsLogs] = await _getTicketReliesAndLogs(id, to);
  const assigneeLogs: OpsLog[] = [];
  const allLogTimeline: OpsLog[] = []
  _.orderBy(opsLogs, 'createdAt').forEach(log => {
    const lastTimeLog = _.last(allLogTimeline);
    switch (log.action) {
      case 'selectAssignee':
      case 'changeAssignee':
        assigneeLogs.push(log)
        break;
      // 算作回复
      case 'replyWithNoContent':
        replies.push({
          id: log.id,
          authorId: log.data?.operator?.objectId,
          createdAt: log.createdAt,
          internal: !!log.internal,
        } as Reply)
        break;
      // resolve close 都按照关闭处理 resolve 不区分客服还是用户
      // 工单的周期 永远是 close -> reopen -> close 循环
      // 其中 close 可能是 close resolve 以不同身份连续出现，但无论如何都会只取第一个
      case 'resolve':
      case 'close':
        if (!lastTimeLog || lastTimeLog.action === 'reopen') {
          allLogTimeline.push(log)
        }
        break;
      case 'reopen':
        if (lastTimeLog && (lastTimeLog.action === 'close' || lastTimeLog.action === 'resolve')) {
          allLogTimeline.push(log)
        }
        break;
      default:
        break;
    }
  })

  const assigneeIds = _getAssigneeIds(assigneeLogs, from);
  const logTimeLine = allLogTimeline.filter(v => !isBefore(v.createdAt, from));
  // 客服用户 closed 的日志为关闭，客服认为已解决的算关闭
  const closedLogs = logTimeLine.filter(v => v.action === 'close' || (v.action === 'resolve' && v.data?.operator?.objectId === ticket.authorId))
  const reopenedLogs = logTimeLine.filter(v => v.action === 'reopen')

  const repliesTimeLine = _.orderBy([...replies, ...opsLogs], 'createdAt')
  const replyDetails = _getReplyDetails(repliesTimeLine, from, ticket);
  const created = isWithinInterval(ticket.createdAt, {
    start: from,
    end: to
  });
  const ticketStat: StatData = {
    created: created ? 1 : 0, // 在统计期间创建则记 1
    closed: closedLogs.length,
    reopened: reopenedLogs.length,
    ..._getConversions(assigneeIds),
    ..._getReplyStat(replyDetails)
  }
  const hasStatData = Object.entries(ticketStat).some(([key, value]) => value > 0)
  // 没有任何统计数据 则不再记录
  if (!hasStatData) {
    return;
  }
  const replyAuthorIds = replyDetails.map(v => v.authorId);
  const authorIds = _.uniq([...replyAuthorIds, ...assigneeIds]);
  const currentAssigneeId = _.last(assigneeIds);
  const customerServiceStats = authorIds.reduce((pre, curr) => {
    pre[curr] = {
      created: 0, //客服不需要统计创建数
      closed: closedLogs.filter(log => {
        // 客服关闭
        if (log.data?.operator?.objectId === curr) {
          return true
        }
        // 用户关闭 或已解决
        if (curr === currentAssigneeId) {
          return log.data?.operator?.objectId === ticket.authorId
        }
        return false;
      }).length,
      reopened: reopenedLogs.filter(log => {
        if (log.data?.operator?.objectId === curr) {
          return true
        }
        if (curr === currentAssigneeId) {
          return log.data?.operator?.objectId === ticket.authorId
        }
        return false;
      }).length,
      ..._getConversions(assigneeIds, curr),
      ..._getReplyStat(replyDetails, curr)
    }
    return pre
  }, {} as {
    [key in string]: StatData
  })
  return {
    ticket: ticketStat,
    customerService: customerServiceStats,
    categoryId: ticket.categoryId
  }
}


const _getTicketCurrentStatus = async () => {
  return Promise.all([
    Status.NEW,
    Status.WAITING_CUSTOMER,
    Status.WAITING_CUSTOMER_SERVICE,
    Status.PRE_FULFILLED,
    Status.FULFILLED,
    Status.CLOSED
  ].map(status => Ticket.queryBuilder().where('status', '==', status).count(AUTH_OPTIONS))
  ).then(([notProcessed, waitingCustomer, waitingCustomerService, preFulfilled, fulfilled, closed]) => {
    return {
      notProcessed,
      waitingCustomer,
      waitingCustomerService,
      preFulfilled,
      fulfilled,
      closed,
    }
  })
}

const _getTicketStat = async (from: Date, to: Date) => {
  const results = await Promise.all([
    _getNewTicketIds(from, to),
    _getReplyTicketIds(from, to),
    _getResponseTicketIds(from, to)
  ])
  const ids = _(results).flatten().uniq().valueOf()
  if (ids.length === 0) {
    return;
  }
  const run = throat(2);
  let statResult: StatResult = {
    customerService: {},
    category: {},
    customerServiceCategory: {}
  };
  await Promise.all(ids.map((id) => run(() => _getTicketStatById(id, from, to).then(value => {
    if (!value) {
      return;
    }
    statResult = mergeStatData(statResult, value);
  }))))
  if (statResult.ticket === undefined || Object.keys(statResult.ticket).length === 0) {
    return;
  }
  return statResult
}

const _refreshWeekdayConfig = async () => {
  const weekday: Day[] | undefined = await Config.get('weekday');
  if (!weekday) {
    throw new Error('未设置工作日，请先设置工作日后再进行统计。')
  }
  WEEKDAY_CONFIG.days = weekday;
  const weekdayDateRange: Record<'from' | 'to', WeekdayDuration> | undefined = await Config.get('work_time');
  if (!weekdayDateRange) {
    throw new Error('未设置工作时间范围，请先设置工作时间范围后再进行统计。')
  }
  WEEKDAY_CONFIG.from = weekdayDateRange.from;
  WEEKDAY_CONFIG.to = weekdayDateRange.to;
  const tmpDate = new Date()
  WEEKDAY_CONFIG.workTime = differenceInSeconds(set(tmpDate,
    WEEKDAY_CONFIG.to
  ), set(tmpDate,
    WEEKDAY_CONFIG.from
  ))
}

// 正常调用不需要传递时间，云函数调用永远统计的是当前时间上一个小时的数据。
export async function hourlyTicketStats(date?: Date) {
  date = date ? date : subHours(new Date(), 1)
  const from = startOfHour(date)
  const to = endOfHour(date)
  try {
    await _refreshWeekdayConfig();
    const currentStatus = await _getTicketCurrentStatus();
    TicketStatusStats.create({
      ACL: {},
      date: from,
      ...currentStatus,
    }, AUTH_OPTIONS)
    const statResult = await _getTicketStat(from, to)
    if (!statResult) {
      return;
    }
    const ticketStats: CreateData<TicketStats>[] = [
      statResult.ticket,
      ...Object.entries(statResult.category).map(([categoryId, statData]) => ({
        ...statData,
        categoryId,
      })),
      ...Object.entries(statResult.customerService).map(([customerServiceId, statData]) => ({
        ...statData,
        customerServiceId,
      })),
      ...Object.entries(statResult.customerServiceCategory).map(([customerServiceCategory, statData]) => {
        const [customerServiceId, categoryId] = customerServiceCategory.split(SEPARATOR)
        return {
          ...statData,
          categoryId,
          customerServiceId,
        }
      })
    ].map(v => {
      return {
        ...v,
        ACL: {},
        date: from
      }
    })
    const batchNumber = Math.ceil(ticketStats.length / 50)
    for (let index = 0; index < batchNumber; index++) {
      await TicketStats.createSome(ticketStats.slice(index * 50, (index + 1) * 50), AUTH_OPTIONS)
    }
    console.log('[completed] :', format(from, 'yyyy-MM-dd HH'))
  } catch (error) {
    console.log('[ticketStat error]', `${format(from, 'yyyy-MM-dd HH')} to  ${format(to, 'yyyy-MM-dd HH')} error`, error)
  }
}







