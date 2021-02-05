export function userDisplayName(user) {
  return user.name || user.username
}

// Used in CustomerServiceStats.
// 0/-1/-2/...: a week ends at 23:59:59 Sunday/Saturday/Friday/...
export const offsetDays = -3

export const enableWeekendWarning = true

/* eslint-disable i18n/no-chinese-character */
export const customTicketMetadataComments = {}
/* esline-enable i18n/no-chinese-character */
