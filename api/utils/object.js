const AV = require('leancloud-storage')
const _ = require('lodash')

/**
 * @param {AV.Object} object
 * @param {object} [options]
 * @param {boolean} [options.ignoreBeforeHook]
 * @param {boolean} [options.ignoreAfterHook]
 * @param {boolean} [options.useMasterKey]
 * @param {AV.User} [options.user]
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
    await object.save(null, {
      useMasterKey: options?.useMasterKey,
      user: options?.user,
    })
  } finally {
    object._flags.__ignore_hooks = ignoredHooks
  }
}

async function isObjectExists(className, id) {
  try {
    await new AV.Query(className).select('objectId').get(id)
    return true
  } catch (error) {
    if (error.code === 101) {
      return false
    }
    throw error
  }
}

module.exports = {
  isObjectExists,
  saveWithoutHooks,
}
