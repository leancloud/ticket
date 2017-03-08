module.exports = {
  TICKET_STATUS: {
    OPEN: 0,
    FULFILLED: 1,
    REJECTED: 2,
    PRE_FULFILLED: 3, // 技术支持人员点击“解决”时会设置该状态，用户确认后状态变更为 FULFILLED
  }
}
