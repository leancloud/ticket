/**
 * 1. 根据时间范围 获取活跃工单 id (新建 有回复 部分 action)
 * 2. 根据 id 获取工单时间线
 * 3. 根据时间线提取统计数据
 */
import _ from 'lodash';
import throat from 'throat';
import { isBefore, differenceInSeconds, nextDay, set, isWithinInterval, format, isAfter, getDay, Day, startOfHour, endOfHour, subHours, differenceInHours, addDays } from 'date-fns';
import { CreateData } from '@/orm';
import { Status, Ticket } from '@/model/Ticket';
import { Reply } from '@/model/Reply';
import { OpsLog, Action as LogAction } from '@/model/OpsLog';
import { TicketStats } from '@/model/TicketStats';
import { TicketStatusStats } from '@/model/TicketStatusStats';


const DEFAULT_WEEKDAY: Day[] = [1, 2, 3, 4, 5]// 工作日 0: 周日
const DEFAULT_WEEKDAY_RANGE_DATE = {
  start: {
    hours: 10,
    minutes: 0,
    seconds: 0
  },
  end: {
    hours: 19,
    minutes: 0,
    seconds: 0
  }
};
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
const fixAskDate = (value: Date) => {
  const day = getDay(value);
  const endDate = set(value, DEFAULT_WEEKDAY_RANGE_DATE.end);
  if (!DEFAULT_WEEKDAY.includes(day) || isBefore(endDate, value)) {
    let tmp = (day + 1) % 7;
    while (!DEFAULT_WEEKDAY.includes(tmp as Day)) {
      tmp = (tmp + 1) % 7;
    }
    return set(nextDay(value, tmp as Day),
      DEFAULT_WEEKDAY_RANGE_DATE.start
    )
  }
  const startDate = set(value, DEFAULT_WEEKDAY_RANGE_DATE.start);
  if (isBefore(value, startDate)) {
    return startDate
  }
  return value;
}
const getRelyTime = (replyDate: Date, askDate: Date) => {
  const workTime = differenceInSeconds(set(new Date(),
    DEFAULT_WEEKDAY_RANGE_DATE.end
  ), set(new Date(),
    DEFAULT_WEEKDAY_RANGE_DATE.start
  )) + 1
  askDate = fixAskDate(askDate);
  const days = Math.ceil(differenceInHours(replyDate, askDate) / 24)
  return workTime * days + differenceInSeconds(replyDate, addDays(askDate, days))
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
  const internalReplyCount = replies.filter(v => v.internal).length
  return {
    replyTime: _.sumBy(hasReplyTimeReplies, 'replyTime'),
    replyTimeCount: hasReplyTimeReplies.length, // 有回复时间的回复
    replyCount: replies.length - internalReplyCount,
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
      cursor.lastAssigneeId = replyOrOpsLog.data?.assignee?.objectId;
      cursor.lastAssigneeDate = replyOrOpsLog.createdAt;
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
        replyTime: replyTime > 0 ? replyTime : 0,
        authorReplyTime: authorReplyTime > 0 ? authorReplyTime : 0,
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
  const replies = timeLine.filter(replyOrOpsLog => !isOpsLog(replyOrOpsLog)) as Reply[];
  const lastStaffReply = _.findLast(replies, reply => getReplyOrOpsLogType(reply, ticket.authorId) === 'staff')
  const lastAssigneeLog = timeLine.find(replyOrOpsLog => isOpsLog(replyOrOpsLog) && ['selectAssignee', 'changeAssignee'].includes(replyOrOpsLog.action))
  const lastReply = _.last(replies);
  const lastReplyType = lastReply ? getReplyOrOpsLogType(lastReply, ticket.authorId) : 'staff'
  return {
    lastAssigneeId: (lastAssigneeLog ? (lastAssigneeLog as OpsLog).data?.assignee?.objectId : ticket.assigneeId) as string,
    lastAssigneeDate: lastAssigneeLog?.createdAt,
    lastStaffReplyDate: lastStaffReply?.createdAt || ticket.createdAt,
    lastReplyType: lastReplyType as 'staff' | 'customerService',
  }
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
  const allLogTimeline: Array<{
    authorId: string;
    createdAt: Date,
    action: LogAction
  }> = []
  const assigneeLogs: OpsLog[] = [];
  _.orderBy(opsLogs, 'createdAt').forEach(log => {
    const lastLog = _.last(opsLogs);
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
        if (!lastLog || lastLog.action === 'reopen') {
          allLogTimeline.push({
            authorId: log.data?.operator?.objectId,
            createdAt: log.createdAt,
            action: 'close',
          })
        }
        break;
      case 'reopen':
        if (lastLog && lastLog.action === 'close') {
          allLogTimeline.push({
            authorId: log.data?.operator?.objectId,
            createdAt: log.createdAt,
            action: log.action,
          })
        }
        break;
      default:
        break;
    }
  })
  const assigneeIds = _getAssigneeIds(assigneeLogs, from);
  const logTimeLine = allLogTimeline.filter(v => !isBefore(v.createdAt, from));
  // 客服用户 closed 的日志为关闭，客服认为已解决的算关闭
  const closedLogs = logTimeLine.filter(v => v.action === 'close' || (v.action === 'resolve' && v.authorId === ticket.authorId))
  const reopenedLogs = logTimeLine.filter(v => v.action === 'reopen')
  const repliesTimeLine = _.orderBy([...replies, ...assigneeLogs], 'createdAt')
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
        if (log.authorId === curr) {
          return true
        }
        // 用户关闭 或已解决
        if (curr === currentAssigneeId) {
          return log.authorId === ticket.authorId
        }
        return false;
      }).length,
      reopened: reopenedLogs.filter(log => {
        if (log.authorId === curr) {
          return true
        }
        if (curr === currentAssigneeId) {
          return log.authorId === ticket.authorId
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
  const waiting = await Ticket.queryBuilder().where('status', '==', Status.WAITING_CUSTOMER_SERVICE).count(AUTH_OPTIONS);
  const accepted = await Ticket.queryBuilder().where('status', 'in', [
    Status.NEW,
    Status.WAITING_CUSTOMER,
    Status.PRE_FULFILLED,// 用户未确认的 仍然算是受理中
  ]).count(AUTH_OPTIONS);
  return {
    waiting,
    accepted: waiting + accepted
  }
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

// 正常调用不需要传递时间，云函数调用永远统计的是当前时间上一个小时的数据。
export async function hourlyTicketStats(date?: Date) {
  date = date ? date : subHours(new Date(), 1)
  const from = startOfHour(date)
  const to = endOfHour(date)
  try {
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







