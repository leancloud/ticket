module.exports = {
  updated: () => {
    return (ctx) => ctx.ticket.isUpdated('latest_reply')
  },
}
