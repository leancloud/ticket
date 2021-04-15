const _ = require('lodash')

const actionTypes = require('./types')

class Action {
  constructor(data, types = actionTypes) {
    if (!_.isPlainObject(data)) {
      throw new Error('Action must be a JSON object')
    }
    const { type, value } = data
    if (typeof type !== 'string') {
      throw new Error('Invalid action type')
    }
    if (!(type in actionTypes)) {
      throw new Error('Unknown action type: ' + type)
    }
    this._executor = types[type](value)
  }

  exec(ctx) {
    this._executor.exec(ctx)
  }
}

class Actions {
  constructor(actions = [], types = actionTypes) {
    if (!Array.isArray(actions)) {
      throw new Error('Actions must be an array')
    }
    this.actions = actions.map((act) => new Action(act, types))
  }

  exec(ctx) {
    this.actions.forEach((act) => act.exec(ctx))
  }
}

module.exports = { Action, Actions, actionTypes }
