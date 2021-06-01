const _ = require('lodash')

const defaultConditions = require('./conditions')

class Condition {
  constructor(data, conditions = defaultConditions) {
    if (!_.isPlainObject(data)) {
      throw new Error('Condition must be a JSON object')
    }
    const { field, operator, value } = data
    if (typeof field !== 'string') {
      throw new Error('Condition field must be a string')
    }
    if (typeof operator !== 'string') {
      throw new Error('Condition operator must be a string')
    }
    if (!(field in conditions)) {
      throw new Error('Unknown condition field: ' + field)
    }
    if (!(operator in conditions[field])) {
      throw new Error('Unknown condition operator: ' + operator)
    }

    try {
      /**
       * @type {(ctx) => boolean}
       */
      this.test = conditions[field][operator](value)
    } catch (error) {
      throw new Error(`Condition "${field} ${operator}": ${error.message}`)
    }
  }
}

class AllCondition {
  constructor(data, conditions = defaultConditions) {
    if (!Array.isArray(data)) {
      throw new Error('All conditions must be an array')
    }
    this.conditions = data.map((item) => new Condition(item, conditions))
  }

  test(ctx) {
    for (const condition of this.conditions) {
      if (!condition.test(ctx)) {
        return false
      }
    }
    return true
  }
}

class AnyCondition {
  constructor(data, conditions = defaultConditions) {
    if (!Array.isArray(data)) {
      throw new Error('Any conditions must be an array')
    }
    this.conditions = data.map((item) => new Condition(item, conditions))
  }

  test(ctx) {
    for (const condition of this.conditions) {
      if (condition.test(ctx)) {
        return true
      }
    }
    return this.conditions.length === 0
  }
}

class Conditions {
  constructor(data, conditions = defaultConditions) {
    if (!_.isPlainObject(data)) {
      throw new Error('Conditions must be a JSON object')
    }
    if (data.all) {
      this.all = new AllCondition(data.all, conditions)
    }
    if (data.any) {
      this.any = new AnyCondition(data.any, conditions)
    }
  }

  test(ctx) {
    if (this.all && !this.all.test(ctx)) {
      return false
    }
    if (this.any && !this.any.test(ctx)) {
      return false
    }
    return true
  }
}

module.exports = {
  AllCondition,
  AnyCondition,
  Condition,
  Conditions,
}
