const AV = require('leancloud-storage')
const _ = require('lodash')

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
  selectAssignee,
}
