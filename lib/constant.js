module.exports = {
  TICKET_STATUS: {
    // 0~99 未开始处理
    NEW: 50, // 新工单，还没有技术支持人员回复
    // 100~199 处理中
    WAITING_CUSTOMER_SERVICE: 120,
    WAITING_CUSTOMER: 160,
    // 200~299 处理完成
    PRE_FULFILLED: 220, // 技术支持人员点击“解决”时会设置该状态，用户确认后状态变更为 FULFILLED
    FULFILLED: 250, // 已解决
    REJECTED: 280, // 已关闭
  }
}
