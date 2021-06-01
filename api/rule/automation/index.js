const AV = require('leancloud-storage')

const { Conditions } = require('../condition')
const { Actions } = require('../action')
const conditions = require('./conditions')

class Automation {
  constructor({ objectId, conditions, actions }) {
    this.id = objectId
    this.rawConditions = conditions
    this.conditions = Automation.parseConditions(conditions)
    this.rawActions = actions
    this.actions = Automation.parseActions(actions)
  }

  static parseConditions(data) {
    return new Conditions(data, conditions)
  }

  static parseActions(data) {
    return new Actions(data)
  }

  test(ctx) {
    return this.conditions.test(ctx)
  }

  exec(ctx) {
    this.actions.exec(ctx)
  }
}

class Automations {
  /**
   * @param {array} automations
   */
  constructor(automations) {
    if (!Array.isArray(automations)) {
      throw new Error('Automations must be an array')
    }
    this.automations = automations.map((a) => new Automation(a))
  }

  /**
   * @param {boolean} [includeInactive]
   */
  static fetchRaw(includeInactive) {
    const query = new AV.Query('Automation').addAscending('position').addAscending('createdAt')
    if (!includeInactive) {
      query.equalTo('active', true)
    }
    return query.find({ useMasterKey: true })
  }

  /**
   * @param {boolean} [includeInactive]
   */
  static async get(includeInactive) {
    const objects = await this.fetchRaw(includeInactive)
    return new Automations(objects.map((o) => o.toJSON()))
  }

  exec(ctx) {
    this.automations.forEach((automation) => {
      if (automation.test(ctx)) {
        automation.exec(ctx)
      }
    })
  }
}

module.exports = { Automation, Automations }
