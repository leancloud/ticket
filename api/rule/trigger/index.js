const AV = require('leancloud-storage')

const { Trigger, Triggers } = require('./trigger')

/**
 * @returns {Promise<Triggers>}
 */
async function getActiveTriggers() {
  const query = new AV.Query('Trigger')
    .equalTo('active', true)
    .addAscending('position')
    .addAscending('createdAt')
  const objects = await query.find({ useMasterKey: true })
  return new Triggers(objects.map((o) => o.toJSON()))
}

/**
 * @returns {Promise<{ success: number, fail: number }>}
 */
async function validateTriggers() {
  const objects = await new AV.Query('Trigger').find({ useMasterKey: true })
  const result = { success: 0, fail: 0 }
  for (const object of objects) {
    try {
      new Trigger(object.toJSON())
      result.success++
    } catch {
      result.fail++
    }
  }
  return result
}

module.exports = { getActiveTriggers, validateTriggers }
