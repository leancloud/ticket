const { Conditions } = require('../condition')
const { Actions } = require('../action')

class Trigger {
  constructor({ objectId, conditions, actions }) {
    this.id = objectId
    this.rawConditions = conditions
    this.conditions = Trigger.parseConditions(conditions)
    this.rawActions = actions
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

  getFiredTriggers() {
    return this.triggers.filter((t) => t.fired === true)
  }
}

module.exports = { Trigger, Triggers }
