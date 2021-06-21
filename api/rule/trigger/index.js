const AV = require('leancloud-storage')

const cache = require('../../utils/cache')
const { Conditions } = require('../condition')
const { Actions } = require('../action')

class Trigger {
  constructor({ objectId, conditions, actions }) {
    this.id = objectId
    this.rawConditions = conditions
    this.rawActions = actions
    this.conditions = Trigger.parseConditions(conditions)
    this.actions = Trigger.parseActions(actions)
  }

  static parseConditions(conditions) {
    return new Conditions(conditions)
  }

  static parseActions(actions) {
    return new Actions(actions)
  }

  test(ctx) {
    return this.conditions.test(ctx)
  }

  exec(ctx) {
    return this.actions.exec(ctx)
  }
}

class Triggers {
  constructor(triggers) {
    if (!Array.isArray(triggers)) {
      throw new Error('Triggers must be an array')
    }
    this.triggers = triggers.map((t) => new Trigger(t))
  }

  /**
   * @param {boolean} [includeInactive]
   */
  static fetchRaw(includeInactive) {
    const query = new AV.Query('Trigger').addAscending('position').addAscending('createdAt')
    if (!includeInactive) {
      query.equalTo('active', true)
    }
    return query.find({ useMasterKey: true })
  }

  /**
   * @param {boolean} [includeInactive]
   */
  static async fetch(includeInactive) {
    const objects = await this.fetchRaw(includeInactive)
    return new Triggers(objects.map((o) => o.toJSON()))
  }

  /**
   * @param {boolean} [includeInactive]
   */
  static get(includeInactive) {
    return cache.get(
      ['triggers', { active: !!includeInactive }],
      () => this.fetch(includeInactive),
      1000 * 60 * 10
    )
  }

  async exec(ctx) {
    const triggers = [...this.triggers]
    let fired = false
    loop: for (;;) {
      for (let i = 0; i < triggers.length; ++i) {
        const trigger = triggers[i]
        if (await trigger.test(ctx)) {
          await trigger.exec(ctx)
          triggers.splice(i, 1)
          fired = true
          continue loop
        }
      }
      break
    }
    return fired
  }
}

module.exports = { Trigger, Triggers }
