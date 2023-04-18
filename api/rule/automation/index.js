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
    return this.actions.exec(ctx)
  }
}

module.exports = { Automation }
