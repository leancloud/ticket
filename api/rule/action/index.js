const _ = require('lodash')

const defaultActions = require('./actions')

class Action {
  constructor(data, actions = defaultActions) {
    if (!_.isPlainObject(data)) {
      throw new Error('Action must be a JSON object')
    }
    const { type, value } = data
    if (typeof type !== 'string') {
      throw new Error('Action type must be a string')
    }
    if (!(type in actions)) {
      throw new Error('Unknown action type: ' + type)
    }

    try {
      /**
       * @type {(ctx: any) => void}
       */
      this.exec = actions[type](value)
    } catch (error) {
      throw new Error(`Action "${type}": ${error.message}`)
    }
  }
}

class Actions {
  constructor(data, actions = defaultActions) {
    if (!Array.isArray(data)) {
      throw new Error('Actions must be an array')
    }
    this.actions = data.map((item) => new Action(item, actions))
  }

  exec(ctx) {
    this.actions.forEach((act) => act.exec(ctx))
  }
}

module.exports = { Action, Actions }
