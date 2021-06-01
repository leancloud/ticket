const AV = require('leancloud-storage')
const _ = require('lodash')

const { TICKET_ACTION, TICKET_STATUS } = require('../../lib/common')
const { getCustomerServiceRole } = require('../customerService/utils')

/**
 * @returns {Promise<string[]>}
 */
async function getVacationerIds() {
  const now = new Date()
  const vacations = await new AV.Query('Vacation')
    .lessThan('startDate', now)
    .greaterThan('endDate', now)
    .find({ useMasterKey: true })
  return vacations.map((v) => v.get('vacationer').id)
}

/**
 * @param {string} categoryId
 * @returns {Promise<AV.User>}
 */
async function selectAssignee(categoryId) {
  const [role, vacationerIds] = await Promise.all([getCustomerServiceRole(), getVacationerIds()])
  const query = role.getUsers().query()
  if (vacationerIds.length) {
    query.notContainedIn('objectId', vacationerIds)
  }
  const users = await query.find({ useMasterKey: true })

  const assignees = users.filter((user) => {
    const categories = user.get('categories')
    if (!categories) {
      return false
    }
    return categories.findIndex((c) => c.objectId === categoryId) !== -1
  })

  return assignees.length ? _.sample(assignees) : _.sample(users)
}

function getActionStatus(action, isCustomerService) {
  switch (action) {
    case TICKET_ACTION.REPLY_WITH_NO_CONTENT:
      return TICKET_STATUS.WAITING_CUSTOMER
    case TICKET_ACTION.REPLY_SOON:
      return TICKET_STATUS.WAITING_CUSTOMER_SERVICE
    case TICKET_ACTION.RESOLVE:
      return isCustomerService ? TICKET_STATUS.PRE_FULFILLED : TICKET_STATUS.FULFILLED
    case TICKET_ACTION.CLOSE:
    // 向前兼容
    // eslint-disable-next-line no-fallthrough
    case TICKET_ACTION.REJECT:
      return TICKET_STATUS.CLOSED
    case TICKET_ACTION.REOPEN:
      return TICKET_STATUS.WAITING_CUSTOMER
    default:
      throw new Error('invalid action')
  }
}

module.exports = {
  getVacationerIds,
  getActionStatus,
  selectAssignee,
}
