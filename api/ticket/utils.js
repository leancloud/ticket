const AV = require('leancloud-storage')
const _ = require('lodash')

const { TICKET_ACTION, TICKET_STATUS } = require('../../lib/common')
const { captureException } = require('../errorHandler')

/**
 * @param {string} categoryId
 * @returns {Promise<{ objectId: string; name: string }>}
 */
async function getTinyCategoryInfo(categoryId) {
  const category = await new AV.Query('Category').get(categoryId)
  return {
    objectId: category.id,
    name: category.get('name'),
  }
}

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
  const [role, vacationerIds] = await Promise.all([
    new AV.Query(AV.Role).equalTo('name', 'customerService').first(),
    getVacationerIds(),
  ])
  const query = role.getUsers().query()
  if (vacationerIds.length) {
    query.notContainedIn('objectId', vacationerIds)
  }
  const users = await query.find({ useMasterKey: true })

  const assignees = users.filter((user) => {
    /**
     * @type {Array<{objectId: string}>}
     */
    const categories = user.get('categories') || []
    return categories.findIndex((c) => c.objectId === categoryId) !== -1
  })

  return assignees.length ? _.sample(assignees) : _.sample(users)
}

function addOpsLog(ticket, action, data) {
  return new AV.Object('OpsLog')
    .save({ ticket, action, data }, { useMasterKey: true })
    .catch(captureException)
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

/**
 * @param {AV.Object} object
 * @param {object} [options]
 * @param {boolean} [options.ignoreBeforeHook]
 * @param {boolean} [options.ignoreAfterHook]
 * @param {boolean} [options.useMasterKey]
 */
async function saveWithoutHooks(object, options) {
  const ignoredHooks = _.clone(object._flags.__ignore_hooks)
  if (options?.ignoreBeforeHook) {
    object.disableBeforeHook()
  }
  if (options?.ignoreAfterHook) {
    object.disableAfterHook()
  }
  try {
    await object.save(null, { useMasterKey: options?.useMasterKey })
  } finally {
    object._flags.__ignore_hooks = ignoredHooks
  }
}

module.exports = {
  getVacationerIds,
  getTinyCategoryInfo,
  addOpsLog,
  saveWithoutHooks,
  getActionStatus,
  selectAssignee,
}
