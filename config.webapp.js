import { setConfig } from './modules/config'

// Used in CustomerServiceStats.
// 0/-1/-2/...: a week ends at 23:59:59 Sunday/Saturday/Friday/...
setConfig('stats.offsetDays', 0)

setConfig('weekendWarning.enabled', true)
