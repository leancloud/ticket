const events = require('../next/api/dist/events').default
const { getTinyUserInfo, getTinyReplyInfo } = require('./common')
const { TICKET_STATUS } = require('../lib/common')
const errorHandler = require('./errorHandler')

exports.replyTicket = (ticket, reply, replyAuthor) => {
  events.emit('reply:created', {
    reply: {
      id: reply.id,
      ticketId: ticket.id,
      authorId: reply.get('author').id,
      content: reply.get('content'),
      isCustomerService: reply.get('isCustomerService'),
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
    },
    currentUserId: replyAuthor.id,
  })

  return Promise.all([
    ticket.fetch({ include: 'author,assignee' }, { user: replyAuthor }),
    getTinyReplyInfo(reply),
    getTinyUserInfo(reply.get('author')),
  ])
    .then(([ticket, tinyReply, tinyReplyAuthor]) => {
      ticket.set('latestReply', tinyReply).increment('replyCount', 1)
      if (reply.get('isCustomerService')) {
        ticket.addUnique('joinedCustomerServices', tinyReplyAuthor)
        ticket.set('status', TICKET_STATUS.WAITING_CUSTOMER)
        ticket.increment('unreadCount')
      } else {
        ticket.set('status', TICKET_STATUS.WAITING_CUSTOMER_SERVICE)
      }
      return ticket.save(null, { user: replyAuthor })
    })
    .catch(errorHandler.captureException)
}
