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
  'assignedCategories': [
    'Categories assigned',
    '负责分类'
  ],
  'delete': [
    'Delete',
    '删除'
  ],
  'disable': [
    'Disable',
    '停用'
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
  'operation': [
    'Operation',
    '操作'
  ],
  'otherAssignees': [
    'Other assignees',
    '其他负责成员'
  ],
  'pm': [
    ' PM',
    ' 下午'
  ],
  'preview': [
    'Preview',
    '预览'
  ],
  'remove': [
    'Remove',
    '移除'
  ],
  'reorder': [
    'Reorder',
    '调整顺序'
  ],
  'return': [
    'Return',
    '返回'
  ],
  'save': [
    'Save',
    '保存'
  ],
  'statistics': [
    'Statistics',
    '统计'
  ],
  'submit': [
    'Submit',
    '提交'
  ],
  'submitter': [
    'Submitter',
    '提交人'
  ],
  'submitDate': [
    'Submit Date',
    '提交时间'
  ],
  'ticket': [
    'Ticket',
    '工单'
  ],
  'ticketList': [
    'Tickets',
    '工单列表'
  ],
  'username': [
    'Username',
    '用户名'
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
  // Categories
  'newCategory': [
    'New category',
    '新增分类'
  ],
  // Category
  'categoryName': [
    'Name',
    '分类名称'
  ],
  'confirmDisableCategory': [
    'Confirm disabling this category: ',
    '确认要停用分类：'
  ],
  'parentCategory': [
    'Parent category (optional)',
    '父分类(可选)'
  ],
  'parentCategoryRequirements': [
    'You cannot assign this category itself or its subcategories as parent category.',
    '父分类不能是分类自己或自己的子分类。'
  ],
  'ticketTemplate': [
    'Ticket template',
    '问题描述模板'
  ],
  'ticketTemplateInfo': [
    'The default content shown when creating a new ticket under this category.',
    '用户新建该分类工单时，问题描述默认显示这里的内容。'
  ],
  // CustomerServiceProfile
  'associatedAccounts': [
    'Associated accounts',
    '账号关联'
  ],
  'weCom': [
    'WeCom',
    '微信企业号'
  ],
  'unlinked': [
    'Unlinked',
    '未关联'
  ],
  // Vacation
  'vacation': [
    'Vacation',
    '请假'
  ],
  'whoIsOnVacation': [
    'Who',
    '请假人'
  ],
  'vacationStart': [
    'Start',
    '请假开始'
  ],
  'backToWork': [
    'Back',
    '工作开始'
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