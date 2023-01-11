const AV = require('leanengine')

const { tickDelayNotify } = require('../next/api/dist')
const { execTimeTriggers } = require('../next/api/dist/ticket/automation/time-trigger')
const { analyzeArticles } = require('../next/api/dist/article/stats')
const { migrateNotifications } = require('../next/api/dist/notification/migrate')
const {
  hourlyTicketStats,
  syncTicketLog,
  dailyPushStatsToSlack,
  weeklyPushStatsToSlack,
  monthlyPushStatsToSlack,
} = require('../next/api/dist/cloud/index.js')
const { User, InactiveUserLoginError } = require('../next/api/dist/model/User.js')

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
AV.Cloud.define('dailyPushStatsToSlack', () => dailyPushStatsToSlack())
AV.Cloud.define('weeklyPushStatsToSlack', () => weeklyPushStatsToSlack())
AV.Cloud.define('monthlyPushStatsToSlack', () => monthlyPushStatsToSlack())

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

AV.Cloud.onLogin((request) => {
  if (request.object.get('active') !== true) {
    throw new AV.Cloud.Error(
      JSON.stringify(new InactiveUserLoginError('Your account is inactive.'))
    )
  }
})

module.exports = { events }
