import { CustomerServiceActionLog } from '@/api/customer-service-action-log';

export function renderAction(log: CustomerServiceActionLog) {
  if (log.type === 'reply') {
    const { reply, revision } = log;
    const replyType = reply ? (reply.internal ? '内部回复' : '公开回复') : '回复';
    if (revision) {
      switch (revision.action) {
        case 'update':
          return '修改' + replyType;
        case 'delete':
          return '删除' + replyType;
      }
    }
    if (reply) {
      return '创建' + replyType;
    }
    return '';
  }
  switch (log.opsLog.action) {
    case 'changeAssignee':
      return '修改负责人';
    case 'changeCategory':
      return '修改分类';
    case 'changeFields':
      return '修改自定义字段值';
    case 'changeGroup':
      return '修改客服组';
    case 'close':
    case 'reject':
    case 'resolve':
      return '关闭工单';
    case 'reopen':
      return '重新打开工单';
    case 'replySoon':
      return '稍后回复工单';
    case 'replyWithNoContent':
      return '认为工单无需回复';
    default:
      return log.opsLog.action;
  }
}
