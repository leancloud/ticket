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
const { InactiveUserLoginError } = require('../next/api/dist/model/User.js')

AV.Cloud.define('delayNotify', () => {
  // XXX: 由于还不能在 next 里定义云函数，先通过 legacy 的云函数调用 next 里的方法来发送 delay notification
  tickDelayNotify()
})

AV.Cloud.define('tickAutomation', { fetchUser: false, internal: true }, () => {
  execTimeTriggers()
})

AV.Cloud.define('analyzeArticles', { fetchUser: false, internal: true }, analyzeArticles)
AV.Cloud.define('migrateNotifications', { fetchUser: false, internal: true }, migrateNotifications)
AV.Cloud.define('statsHour', (req) => {
  if (req.params.date) {
    const date = new Date(req.params.date)
    if (isNaN(date.getTime())) {
      console.error('Cloud Function - statsHour: invalid date')
      return
    }
    hourlyTicketStats(date)
  } else {
    hourlyTicketStats()
  }
})
AV.Cloud.define('syncTicketLog', () => syncTicketLog())
AV.Cloud.define('dailyPushStatsToSlack', () => dailyPushStatsToSlack())
AV.Cloud.define('weeklyPushStatsToSlack', () => weeklyPushStatsToSlack())
AV.Cloud.define('monthlyPushStatsToSlack', () => monthlyPushStatsToSlack())

const { cancelTicketExportJob, getTicketExportJobInfo } = require('../next/api/dist/ticket/export')
AV.Cloud.define('cancelTicketExportJob', (req) => {
  if (!req.params.jobId) {
    console.error('Cloud Function - removeExportJob: missing jobId')
    return
  }

  cancelTicketExportJob(req.params.jobId)
})

AV.Cloud.define('getTicketExportJobInfo', () => {
  getTicketExportJobInfo()
})

AV.Cloud.onLogin((request) => {
  if (request.object.get('inactive')) {
    throw new AV.Cloud.Error(
      JSON.stringify(new InactiveUserLoginError('Your account is inactive.'))
    )
  }
})

const { emailService } = require('../next/api/dist/service/email')
AV.Cloud.define('checkSupportEmailMessage', { fetchUser: false, internal: true }, () => {
  emailService.checkNewMessages()
})

const { ready } = require('../next/api/dist/launch')
exports.ready = ready
