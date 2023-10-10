import React from 'react'

import { setConfig } from './modules/config'

// Used in CustomerServiceStats.
// 0/-1/-2/...: a week ends at 23:59:59 Sunday/Saturday/Friday/...
setConfig('stats.offsetDays', 0)

setConfig('weekendWarning.enabled', true)

setConfig('ticket.metadata.customMetadata.userLabelOverlay', {
  overlay: ({ user }) => (
    <a href={`https://www.taptap.cn/admin/user/edit/${user.username}`} target="__blank">
      TapTap 用户信息
    </a>
  ),
})
