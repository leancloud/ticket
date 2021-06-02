import { setConfig } from './modules/config'

// Used in CustomerServiceStats.
// 0/-1/-2/...: a week ends at 23:59:59 Sunday/Saturday/Friday/...
setConfig('stats.offsetDays', -3)

setConfig('weekendWarning.enabled', true)

/* eslint-disable i18n/no-chinese-character */
setConfig('ticket.metadata.customMetadata.comments', {
  game_name: '游戏名称',
  developer_name: '厂商名称',
})
/* eslint-enable i18n/no-chinese-character */

setConfig('nav.customerServiceTickets.href', '/customerService/tickets?isOpen=true')

import { useClientPlugin } from './plugin/client'
import { jiraClientPlugin } from './tgb/jira/client'
useClientPlugin(jiraClientPlugin())
