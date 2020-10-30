/* eslint-disable i18n/no-chinese-character */
const messages = {
  // About
  'about': [
    'About',
    '关于'
  ],
  'lightweight': [
    'A lightweight',
    '轻量级的'
  ],
  'oss': [
    'open-source',
    '开源'
  ],
  'intro': [
    'support ticket application, helping you to make happy customers.',
    '工单应用，助你提升客户满意度。'
  ],
  'builtWith': [
    'Built with React, Express, and ',
    '基于 React、Express、'
  ],
  'leanCloudUrl': [
    'https://leancloud.app',
    'https://leancloud.cn'
  ],
  'builtWithEnding': [
    '.',
    '构建。'
  ],
  // general
  'assigned': [
    'Assigned',
    '我是否负责'
  ],
  'hour': [
    'hour',
    '小时'
  ],
  'loading': [
    'Loading',
    '读取中'
  ],
  'name': [
    'Name',
    '名称'
  ],
  'otherAssignees': [
    'Other assignees',
    '其他负责成员'
  ],
  'preview': [
    'Preview',
    '预览'
  ],
  'reorder': [
    'Reorder',
    '调整顺序'
  ],
  'statistics': [
    'Statistics',
    '统计'
  ],
  'ticket': [
    'Ticket',
    '工单'
  ],
  'ticketList': [
    'Tickets',
    '工单列表'
  ],
  // CSStatsUser
  'notInvoled': [
    'Not involved',
    '没有参与'
  ],
  'firstRelyTime': [
    'first reply time',
    '首次回复时间'
  ],
  'averageReplyTime': [
    'average reply time',
    '平均回复时间'
  ],
  'replyCount': [
    'replies',
    '回复次数'
  ],
  // Category
  'newCategory': [
    'New category',
    '新增分类'
  ]
}

function splitIntoLocales(messages, localeIndex) {
  const result = {}
  for (const k in messages) {
    result[k] = messages[k][localeIndex]
  }
  return result
}

const en = splitIntoLocales(messages, 0)
const zh = splitIntoLocales(messages, 1)

const locales = {en, zh}

export default locales