import _ from 'lodash';
import { differenceInSeconds, isAfter, isBefore } from 'date-fns';

import { Ticket } from '@/model/Ticket';
import { Reply } from '@/model/Reply';
import { OpsLog } from '@/model/OpsLog';

const AUTH_OPTIONS = { useMasterKey: true };
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
    throw Error;
  }
};
const _getReplyTicketIds = async (
  from: Date,
  to: Date,
  limit = 100,
  skip = 0
): Promise<string[]> => {
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
    throw Error;
  }
};
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
      .where('action', 'in', [
        'replyWithNoContent', // 视为一个 reply
        'changeAssignee',
        'selectAssignee',
        'reopen',
        'resolve',
        'close',
      ])
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
    throw Error;
  }
};
/** 获取需要统计的工单 id */
export const getTicketStatIds = async (from: Date, to: Date) =>
  Promise.all([
    _getNewTicketIds(from, to),
    _getReplyTicketIds(from, to),
    _getResponseTicketIds(from, to),
  ]).then((results) => _(results).flatten().uniq().valueOf());

const _getTicketTimeLine = (id: string, endDate: Date) => {
  const repliesPromise = Reply.queryBuilder()
    .where('createdAt', '<=', endDate)
    .where('ticket', '==', Ticket.ptr(id))
    .orderBy('createdAt')
    .find(AUTH_OPTIONS);
  const opsLogsPromise = OpsLog.queryBuilder()
    .where('createdAt', '<=', endDate)
    .where('ticket', '==', Ticket.ptr(id))
    .orderBy('createdAt')
    .find(AUTH_OPTIONS);
  return Promise.all([repliesPromise, opsLogsPromise]).then(([replies, opsLogs]) =>
    _.orderBy([...replies, ...opsLogs], 'createdAt')
  );
};
const _isOpsLog = (obj: Reply | OpsLog): obj is OpsLog => 'action' in obj;
const _getReplyOrOpsLogType = (replyOrOpsLog: OpsLog | Reply, ticketAuthorId: string) => {
  if (_isOpsLog(replyOrOpsLog)) {
    const { data } = replyOrOpsLog;
    if (!data.operator || !data.operator.objectId || data.operator.objectId === 'system') {
      return 'system';
    }
    return data.operator.objectId === ticketAuthorId ? 'staff' : 'customerService';
  } else {
    return replyOrOpsLog.authorId === ticketAuthorId ? 'staff' : 'customerService';
  }
};
/*** 获取一个工单的数据详情 */
export const getTicketDataById = async (id: string, endDate: Date) => {
  const ticket = await Ticket.find(id, AUTH_OPTIONS);
  if (!ticket) {
    return;
  }
  const timeLine = await _getTicketTimeLine(id, endDate);
  const cursor = {
    lastAssigneeId: ticket.assigneeId,
    lastAssigneeDate: ticket.createdAt,
    lastStaffReplyDate: ticket.createdAt,
    lastReplyType: 'staff',
  };
  const assigneeLogs: OpsLog[] = [];
  const lifeLogs: OpsLog[] = [];
  const replies: Array<{
    internal: boolean;
    authorId: string;
    createdAt: Date;
    id: string;
    cursor?: typeof cursor;
  }> = [];
  timeLine.forEach((replyOrOpsLog) => {
    if (_isOpsLog(replyOrOpsLog)) {
      const lastTimeLog = _.last(lifeLogs);
      switch (replyOrOpsLog.action) {
        case 'selectAssignee':
        case 'changeAssignee':
          assigneeLogs.push(replyOrOpsLog);
          cursor.lastAssigneeId = replyOrOpsLog.data?.assignee?.objectId;
          cursor.lastAssigneeDate = replyOrOpsLog.createdAt;
          break;
        // 视为一个回复
        case 'replyWithNoContent':
          replies.push({
            id: replyOrOpsLog.id,
            internal: !!replyOrOpsLog.internal,
            authorId: replyOrOpsLog.data?.operator?.objectId,
            createdAt: replyOrOpsLog.createdAt,
            cursor:
              !!replyOrOpsLog.internal || cursor.lastReplyType === 'customerService'
                ? undefined
                : {
                    ...cursor,
                  },
          });
          cursor.lastReplyType = 'customerService';
          break;
        case 'resolve':
        case 'close':
          if (!lastTimeLog || lastTimeLog.action === 'reopen') {
            lifeLogs.push(replyOrOpsLog);
          }
          break;
        case 'reopen':
          if (lastTimeLog && (lastTimeLog.action === 'close' || lastTimeLog.action === 'resolve')) {
            lifeLogs.push(replyOrOpsLog);
          }
          if (_getReplyOrOpsLogType(replyOrOpsLog, ticket.authorId) === 'staff') {
            cursor.lastReplyType = 'staff';
            cursor.lastStaffReplyDate = replyOrOpsLog.createdAt;
          }
          break;
        default:
          break;
      }
    } else {
      const type = _getReplyOrOpsLogType(replyOrOpsLog, ticket.authorId);
      if (type === 'staff' && cursor.lastReplyType !== 'staff') {
        cursor.lastStaffReplyDate = replyOrOpsLog.createdAt;
        cursor.lastReplyType = 'staff';
      }
      if (type === 'customerService') {
        replies.push({
          id: replyOrOpsLog.id,
          internal: !!replyOrOpsLog.internal,
          authorId: replyOrOpsLog.authorId,
          createdAt: replyOrOpsLog.createdAt,
          cursor:
            !!replyOrOpsLog.internal || cursor.lastReplyType === 'customerService'
              ? undefined
              : {
                  ...cursor,
                },
        });
        cursor.lastReplyType = 'customerService';
      }
    }
  });

  return {
    ticket,
    assigneeLogs,
    lifeLogs,
    replies,
  };
};

type TicketData = NonNullable<Awaited<ReturnType<typeof getTicketDataById>>>;
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
  likeCount: number;
  dislikeCount: number;
}
interface ReplyDetail {
  id: string;
  first: boolean;
  replyTime?: number;
  naturalReplyTime?: number;
  authorReplyTime?: number;
  internal: boolean;
  authorId: string;
  createdAt: Date;
}

const _getAssigneeIds = (assigneeLogs: OpsLog[], from: Date) => {
  const [beforeLogs, logs] = _.partition(assigneeLogs, (log) => isBefore(log.createdAt, from));
  const preAssigneeIds: string[] = beforeLogs.map((log) => log.data.assignee?.objectId);
  const assigneeIds: string[] = logs.map((log) => log.data.assignee?.objectId);
  return [_.last(preAssigneeIds), ...assigneeIds].filter(
    (assigneeId): assigneeId is string => !!assigneeId
  );
};
const _getConversions = (assigneeIds: string[], assigneeId?: string) => {
  if (!assigneeId) {
    return {
      conversion: assigneeIds.length - 1 > 0 ? assigneeIds.length - 1 : 0,
      internalConversion: assigneeIds.length - 1 > 0 ? assigneeIds.length - 1 : 0, // 暂时默认所有流转都是内部流转
      externalConversion: 0,
    };
  }
  let conversion = assigneeIds.filter((v) => v === assigneeId).length;
  if (_.last(assigneeIds) === assigneeId) {
    conversion = conversion - 1;
  }
  return {
    conversion: conversion > 0 ? conversion : 0,
    internalConversion: conversion > 0 ? conversion : 0, // 暂时默认所有流转都是内部流转
    externalConversion: 0,
  };
};
const _getReplyStat = (replies: Array<ReplyDetail>, authorId?: string) => {
  replies = authorId
    ? replies
        .filter((v) => v.authorId === authorId)
        .map((v) => ({
          ...v,
          replyTime: v.authorReplyTime,
        }))
    : replies;
  const hasReplyTimeReplies = replies.filter((v) => v.replyTime && v.replyTime > 0);
  const firstReplies = replies.filter((v) => v.first && v.replyTime && v.replyTime > 0);
  const userReplies = replies.filter((v) => v.naturalReplyTime && v.naturalReplyTime > 0);
  const internalReplyCount = replies.filter((v) => v.internal).length;
  return {
    replyTime: _.sumBy(hasReplyTimeReplies, 'replyTime'),
    replyTimeCount: hasReplyTimeReplies.length, // 有回复时间的回复
    replyCount: replies.length - internalReplyCount,
    naturalReplyTime: _.sumBy(userReplies, 'naturalReplyTime'),
    naturalReplyCount: userReplies.length,
    firstReplyTime: _.sumBy(firstReplies, 'replyTime'),
    firstReplyCount: firstReplies.length,
    internalReplyCount,
  };
};

export const parseTicketData = (
  data: TicketData,
  start: Date,
  getRelyTime: (replyDate: Date, askDate: Date) => number
) => {
  const { ticket, assigneeLogs, lifeLogs, replies } = data;
  const assigneeIds = _getAssigneeIds(assigneeLogs, start);
  const logTimeLine = lifeLogs.filter((v) => !isBefore(v.createdAt, start));
  // 客服用户 closed 的日志为关闭，客服认为已解决的算关闭
  const closedLogs = logTimeLine.filter(
    (v) =>
      v.action === 'close' ||
      (v.action === 'resolve' && v.data?.operator?.objectId === ticket.authorId)
  );
  const reopenedLogs = logTimeLine.filter((v) => v.action === 'reopen');
  const created = !isBefore(ticket.createdAt, start);
  const [beforeReplies, afterReplies] = _.partition(replies, (v) => isBefore(v.createdAt, start));
  const beforeRepliesLength = beforeReplies.length;
  const replyDetails = afterReplies
    .filter((v) => !isBefore(v.createdAt, start))
    .map((v, index) => {
      const { cursor, ...rest } = v;
      const replyTime = cursor ? getRelyTime(v.createdAt, cursor.lastStaffReplyDate) : undefined;
      const naturalReplyTime = cursor
        ? differenceInSeconds(v.createdAt, cursor.lastStaffReplyDate)
        : undefined;
      let authorReplyTime = replyTime;
      if (
        cursor &&
        cursor.lastAssigneeDate &&
        cursor.lastAssigneeId === v.authorId &&
        isAfter(cursor.lastAssigneeDate, cursor.lastStaffReplyDate)
      ) {
        authorReplyTime = getRelyTime(v.createdAt, cursor.lastAssigneeDate);
      }
      return {
        ...rest,
        first: beforeRepliesLength === 0 && index === 0,
        replyTime,
        naturalReplyTime,
        authorReplyTime,
      };
    });

  const ticketStat: StatData = {
    created: created ? 1 : 0, // 在统计期间创建则记 1
    closed: closedLogs.length,
    reopened: reopenedLogs.length,
    likeCount: ticket.evaluation?.star ? 1 : 0,
    dislikeCount: ticket.evaluation?.star === 0 ? 1 : 0,
    ..._getConversions(assigneeIds),
    ..._getReplyStat(replyDetails),
  };
  const hasStatData = Object.values(ticketStat).some((v) => v > 0);
  // 没有任何统计数据 则不再记录
  if (!hasStatData) {
    return;
  }
  const replyAuthorIds = afterReplies.map((v) => v.authorId);
  const authorIds = _.uniq([...replyAuthorIds, ...assigneeIds]);
  const currentAssigneeId = _.last(assigneeIds);
  const customerServiceStats = authorIds.reduce(
    (pre, curr) => {
      pre[curr] = {
        likeCount: 0,
        dislikeCount: 0,
        created: 0, //客服不需要统计创建数
        closed: closedLogs.filter((log) => {
          // 客服关闭
          if (log.data?.operator?.objectId === curr) {
            return true;
          }
          // 用户关闭 或已解决
          if (curr === currentAssigneeId) {
            return log.data?.operator?.objectId === ticket.authorId;
          }
          return false;
        }).length,
        reopened: reopenedLogs.filter((log) => {
          if (log.data?.operator?.objectId === curr) {
            return true;
          }
          if (curr === currentAssigneeId) {
            return log.data?.operator?.objectId === ticket.authorId;
          }
          return false;
        }).length,
        ..._getConversions(assigneeIds, curr),
        ..._getReplyStat(replyDetails, curr),
      };
      return pre;
    },
    {} as {
      [key in string]: StatData;
    }
  );

  if (
    ticket.evaluation !== undefined &&
    ticket.assigneeId &&
    ticket.assigneeId in customerServiceStats
  ) {
    ticket.evaluation.star
      ? (customerServiceStats[ticket.assigneeId].likeCount = 1)
      : (customerServiceStats[ticket.assigneeId].dislikeCount = 1);
  }

  return {
    ticket: ticketStat,
    customerService: customerServiceStats,
    categoryId: ticket.categoryId,
    details: replyDetails
      .filter((v) => v.replyTime !== undefined)
      .map((v) => {
        return {
          nid: ticket.nid,
          id: v.id,
          categoryId: ticket.categoryId,
          first: v.first,
          replyTime: v.replyTime || 0,
          naturalReplyTime: v.naturalReplyTime || 0,
          authorReplyTime: v.authorReplyTime || 0,
          authorId: v.authorId,
        };
      }),
  };
};

type RawData = NonNullable<ReturnType<typeof parseTicketData>>;
interface StatResult {
  ticket?: StatData;
  customerService: {
    [key in string]: StatData;
  };
  category: {
    [key in string]: StatData;
  };
  customerServiceCategory: {
    [key in string]: StatData;
  };
  details: RawData['details'];
}
export const MERGE_SEPARATOR = '__';
const _customizer = (objValue?: number, srcValue = 0) =>
  objValue === undefined ? srcValue : objValue + srcValue;

export const mergeData = (target: StatResult, source?: RawData) => {
  if (!source) {
    return target;
  }
  const newCustomerServiceCategory = Object.keys(source.customerService).reduce((pre, curr) => {
    const key = [curr, source.categoryId].join(MERGE_SEPARATOR);
    pre[key] = source.customerService[curr];
    return pre;
  }, {} as StatResult['customerServiceCategory']);
  return {
    ticket: _.mergeWith({ ...target.ticket }, source.ticket, _customizer),
    customerService: _.mergeWith(
      { ...target.customerService },
      source.customerService,
      (objValue, srcValue) => {
        if (!objValue) {
          return srcValue;
        }
        return _.mergeWith({ ...objValue }, srcValue, _customizer);
      }
    ),
    category: {
      ...target.category,
      [source.categoryId]: _.mergeWith(
        { ...target.category[source.categoryId] },
        source.ticket,
        _customizer
      ),
    },
    customerServiceCategory: _.mergeWith(
      { ...target.customerServiceCategory },
      newCustomerServiceCategory,
      (objValue, srcValue) => {
        if (!objValue) {
          return srcValue;
        }
        return _.mergeWith({ ...objValue }, srcValue, _customizer);
      }
    ),
    details: [...target.details, ...source.details],
  };
};
