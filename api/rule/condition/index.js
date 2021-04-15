const _ = require('lodash')

const conditionFields = require('./fields')

class Condition {
  constructor(data, fields = conditionFields) {
    if (!_.isPlainObject(data)) {
      throw new Error('Condition must be a JSON object')
    }
    const { field, operator, value } = data
    if (typeof field !== 'string') {
      throw new Error('Field must be a string')
    }
    if (typeof operator !== 'string') {
      throw new Error('Operator must be a string')
    }
    if (!(field in fields)) {
      throw new Error('Unknown field: ' + field)
    }
    const operators = fields[field]
    if (!(operator in operators)) {
      throw new Error('Unknown operator: ' + operator)
    }
    this._tester = operators[operator](value)
  }

  test(ctx) {
    return this._tester.test(ctx)
  }
}

class AllCondition {
  constructor(conditions, fields = conditionFields) {
    if (!Array.isArray(conditions)) {
      throw new Error('All conditions must be an array')
    }
    this.conditions = conditions.map((cond) => new Condition(cond, fields))
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
  constructor(conditions = {}, fields = conditionFields) {
    if (!Array.isArray(conditions)) {
      throw new Error('Any conditions must be an array')
    }
    this.conditions = conditions.map((cond) => new Condition(cond, fields))
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
  constructor(conditions, fields = conditionFields) {
    if (!_.isPlainObject(conditions)) {
      throw new Error('Conditions must be a JSON object')
    }
    if (conditions.all) {
      this.all = new AllCondition(conditions.all, fields)
    }
    if (conditions.any) {
      this.any = new AnyCondition(conditions.any, fields)
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
  conditionFields,
}
