import { setConfig } from './modules/config'

// Used in CustomerServiceStats.
// 0/-1/-2/...: a week ends at 23:59:59 Sunday/Saturday/Friday/...
setConfig('stats.offsetDays', -3)

setConfig('weekendWarning.enabled', true)

/* eslint-disable i18n/no-chinese-character */
setConfig('ticket.metadata.customMetadata.comments', {
  CH: '渠道',
  LANG: '设备语言',
  PN: '应用版本代码',
  UID: '设备ID',
  VID: 'TapID',
  VN: '应用版本号',
  contact: '联系方式',
  deviceName: '设备',
  deviceVersion: '设备型号',
  gameID: '游戏ID',
  gameName: '用户选择的游戏名字',
  systemVersion: '系统版本',
  taptapID: 'TapID',
})
/* eslint-enable i18n/no-chinese-character */

setConfig('nav.customerServiceTickets.href', '/customerService/tickets?isOpen=true')

import { useClientPlugin } from './plugin/client'
import { jiraClientPlugin } from './tgb/jira/client'
useClientPlugin(jiraClientPlugin())
