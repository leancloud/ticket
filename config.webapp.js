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
export const customTicketMetadataComments = {
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
}
/* esline-enable i18n/no-chinese-character */
