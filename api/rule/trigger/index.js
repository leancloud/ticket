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
    this.fired = false
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
    this.actions.exec(ctx)
    this.fired = true
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
   * @param {object} options
   * @param {boolean} [options.includeInactive]
   */
  static async fetchRaw(options) {
    const query = new AV.Query('Trigger').addAscending('position').addAscending('createdAt')
    if (!options?.includeInactive) {
      query.equalTo('active', true)
    }
    return await query.find({ useMasterKey: true })
  }

  /**
   * @param {object} options
   * @param {boolean} [options.includeInactive]
   */
  static async fetch(options) {
    const objects = await this.fetchRaw(options)
    return new Triggers(objects.map((o) => o.toJSON()))
  }

  /**
   * @param {object} options
   * @param {boolean} [options.includeInactive]
   */
  static get(options) {
    return cache.get(
      ['triggers', { active: !!options?.includeInactive }],
      () => this.fetch(options),
      1000 * 60 * 10
    )
  }

  exec(ctx) {
    const triggers = [...this.triggers]
    loop: for (;;) {
      for (let i = 0; i < triggers.length; ++i) {
        const trigger = triggers[i]
        if (trigger.test(ctx)) {
          trigger.exec(ctx)
          triggers.splice(i, 1)
          continue loop
        }
      }
      break
    }
  }
}

module.exports = { Trigger, Triggers }
