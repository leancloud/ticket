const AV = require('leanengine')

const { tickDelayNotify } = require('../next/api/dist')
const { execTimeTriggers } = require('../next/api/dist/ticket/automation/time-trigger')
const { analyzeArticles } = require('../next/api/dist/article/stats')
const { migrateNotifications } = require('../next/api/dist/notification/migrate')
const { hourlyTicketStats, syncTicketLog } = require('../next/api/dist/cloud/index.js')
const { User } = require('../next/api/dist/model/User.js')

const events = require('../next/api/dist/events').default

AV.Cloud.define('delayNotify', () => {
  // XXX: 由于还不能在 next 里定义云函数，先通过 legacy 的云函数调用 next 里的方法来发送 delay notification
  tickDelayNotify()
})

AV.Cloud.define('tickAutomation', { fetchUser: false, internal: true }, () => {
  execTimeTriggers()
})

AV.Cloud.define('analyzeArticles', { fetchUser: false, internal: true }, analyzeArticles)
AV.Cloud.define('migrateNotifications', { fetchUser: false, internal: true }, migrateNotifications)
AV.Cloud.define('statsHour', () => hourlyTicketStats())
AV.Cloud.define('syncTicketLog', () => syncTicketLog())

// TDS User Login
if (process.env.ENABLE_TDS_USER_LOGIN) {
  AV.Cloud.onAuthData((request) => {
    const tdsUserData = request.authData['tds-user']

    if (tdsUserData) {
      const { access_token } = tdsUserData
      try {
        return {
          ...request.authData,
          'tds-user': User.generateTDSUserAuthData(access_token),
        }
      } catch (err) {
        throw new AV.Cloud.Error(JSON.stringify(err))
      }
    }

    return request.authData
  })
}

module.exports = { events }
