/* eslint-disable no-unused-vars */

export function userDisplayName(user, inCustomerServiceView = false) {
  return user.data.name || user.data.username
}

export function customerServiceDisplayName(user) {
  return userDisplayName(user)
}

// Used in CustomerServiceStats.
// 0/-1/-2/...: a week ends at 23:59:59 Sunday/Saturday/Friday/...
export const offsetDays = -3

export const enableWeekendWarning = true

/* eslint-disable i18n/no-chinese-character */
export const customTicketMetadataComments = {}
/* esline-enable i18n/no-chinese-character */
