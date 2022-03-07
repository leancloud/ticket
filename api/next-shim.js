const AV = require('leanengine')

const { tickDelayNotify } = require('../next/api/dist')
const { execTimeTriggers } = require('../next/api/dist/ticket/automation/time-trigger')
const { analyzeArticles } = require('../next/api/dist/article/stats')
const { hourlyTicketStats } = require('../next/api/dist/cloud/ticketStats.js')

const events = require('../next/api/dist/events').default

AV.Cloud.define('delayNotify', () => {
  // XXX: 由于还不能在 next 里定义云函数，先通过 legacy 的云函数调用 next 里的方法来发送 delay notification
  tickDelayNotify()
})

AV.Cloud.define('tickAutomation', { fetchUser: false, internal: true }, () => {
  execTimeTriggers()
})

AV.Cloud.define('analyzeArticles', { fetchUser: false, internal: true }, analyzeArticles)
AV.Cloud.define('statsHour', () => {
  hourlyTicketStats()
})

module.exports = { events }
