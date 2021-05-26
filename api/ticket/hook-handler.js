const AV = require('leancloud-storage')

const { addOpsLog } = require('./utils')
const notification = require('../notification')
const { getTinyUserInfo } = require('../common')
const { ticketStatus } = require('../../lib/common')
const { invokeWebhooks } = require('../webhook')
const { getActiveTriggers, recordTriggerLog } = require('../rule/trigger')
const { Context } = require('../rule/context')
const { systemUser } = require('../user/utils')

/**
 * @param {AV.Object} ticket
 * @param {'create' | 'update'} updateType
 */
async function invokeTriggers(ticket, updateType) {
  // Triggers do not run or fire on tickets after they are closed.
  // However, triggers can fire when a ticket is being set to closed.
  if (ticketStatus.isClosed(ticket.get('status')) && !ticket.updatedKeys?.includes('status')) {
    return
  }

  const ctx = new Context(ticket.toJSON(), updateType, ticket.updatedKeys)
  const triggers = await getActiveTriggers()
  triggers.exec(ctx)
  if (ctx.isUpdated()) {
    const updatedData = ctx.getUpdatedData()
    const ticketToUpdate = AV.Object.createWithoutData('Ticket', ticket.id)
    ticketToUpdate.disableAfterHook()
    await ticketToUpdate.save(updatedData, { useMasterKey: true })

    const ticketToInvokeHook = AV.Object.createWithoutData('Ticket', ticket.id)
    Object.entries(ctx.data).forEach(([key, value]) => (ticketToInvokeHook.attributes[key] = value))
    ticketToInvokeHook.updatedKeys = Object.keys(updatedData)
    afterUpdateTicketHandler(ticketToInvokeHook, { skipTriggers: updateType === 'update' })
  }

  recordTriggerLog(triggers, ticket.id)
}

/**
 * @param {AV.Object} ticket
 */
async function afterSaveTicketHandler(ticket) {
  await ticket.fetch({ include: ['author', 'assignee'] }, { useMasterKey: true })
  const author = ticket.get('author')
  const assignee = ticket.get('assignee')
  addOpsLog(ticket, 'selectAssignee', {
    assignee: await getTinyUserInfo(assignee),
  })
  notification.newTicket(ticket, author, assignee)
  invokeWebhooks('ticket.create', { ticket: ticket.toJSON() })
  invokeTriggers(ticket, 'create')
}

/**
 * @param {AV.Object} ticket
 * @param {object} [options]
 * @param {AV.User} [options.user]
 * @param {boolean} [options.skipTriggers]
 * @param {boolean} [options.skipFetchAssignee]
 */
async function afterUpdateTicketHandler(ticket, options) {
  if (!options?.skipFetchAssignee) {
    await ticket.fetch({ include: ['assignee'] }, { useMasterKey: true })
  }
  const user = options?.user || systemUser
  const userInfo = await getTinyUserInfo(user)

  if (ticket.updatedKeys?.includes('category')) {
    addOpsLog(ticket, 'changeCategory', {
      category: ticket.get('category'),
      operator: userInfo,
    })
  }

  if (ticket.updatedKeys?.includes('assignee')) {
    const assigneeInfo = await getTinyUserInfo(ticket.get('assignee'))
    addOpsLog(ticket, 'changeAssignee', {
      assignee: assigneeInfo,
      operator: userInfo,
    })
    notification.changeAssignee(ticket, user, ticket.get('assignee'))
  }

  if (ticket.updatedKeys?.includes('status')) {
    if (ticketStatus.isClosed(ticket.get('status'))) {
      AV.Cloud.run('statsTicket', { ticketId: ticket.id })
    }
  }

  if (ticket.updatedKeys?.includes('evaluation') && options?.user) {
    notification.ticketEvaluation(ticket, options.user, ticket.get('assignee'))
  }

  invokeWebhooks('ticket.update', {
    ticket: ticket.toJSON(),
    updatedKeys: ticket.updatedKeys,
  })

  if (!options?.skipTriggers) {
    invokeTriggers(ticket, 'update')
  }
}

module.exports = { afterSaveTicketHandler, afterUpdateTicketHandler }
