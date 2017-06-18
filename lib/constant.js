module.exports = {
  TICKET_STATUS: {
    NEW: 0, // 新工单，还没有技术支持人员回复
    WAITING_CUSTOMER_SERVICE: 5,
    WAITING_CUSTOMER: 6,
    FULFILLED: 1, // 已解决
    REJECTED: 2, // 已关闭
    PRE_FULFILLED: 3, // 技术支持人员点击“解决”时会设置该状态，用户确认后状态变更为 FULFILLED
  }
}
