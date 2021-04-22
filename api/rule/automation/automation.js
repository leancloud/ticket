const { Conditions } = require('../condition')
const { Actions } = require('../action')
const fields = require('./condition/fields')
const types = require('./action/types')

class Automation {
  constructor({ objectId, conditions, actions }) {
    this.id = objectId
    this.rawConditions = conditions
    this.conditions = Automation.parseConditions(conditions)
    this.rawActions = actions
    this.actions = Automation.parseActions(actions)
  }

  static parseConditions(conditions) {
    return new Conditions(conditions, fields)
  }

  static parseActions(actions) {
    return new Actions(actions, types)
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

  exec(ctx) {
    this.automations.forEach((automation) => {
      if (automation.test(ctx)) {
        automation.exec(ctx)
      }
    })
  }
}

module.exports = { Automation, Automations }
