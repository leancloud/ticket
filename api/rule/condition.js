const _ = require('lodash')

const { TICKET_STATUS } = require('../../lib/common')

class UpdateTypeIs {
  constructor(value) {
    const values = ['create', 'update']
    if (!values.includes(value)) {
      throw new Error('Value must be one of ' + values.join(','))
    }
    this.value = value
  }

  test(ctx) {
    return ctx.updateType === this.value
  }
}

class StatusIs {
  constructor(value) {
    if (!(value in _.invert(TICKET_STATUS))) {
      throw new Error('Invalid status')
    }
    this.value = value
  }

  test(ctx) {
    return ctx.getTicketStatus() === this.value
  }
}

class StatusIsNot extends StatusIs {
  test(ctx) {
    return !super.test(ctx)
  }
}

class AssigneeIdIs {
  constructor(value) {
    if (typeof value !== 'string') {
      throw new Error('Assignee ID must be a string')
    }
    this.value = value
  }

  test(ctx) {
    if (this.value === '') {
      return ctx.getTicketAssigneeId() === undefined
    }
    return ctx.getTicketAssigneeId() === this.value
  }
}

class AssigneeIdIsNot extends AssigneeIdIs {
  test(ctx) {
    return !super.test(ctx)
  }
}

const conditionFields = {
  updateType: {
    is: (value) => new UpdateTypeIs(value),
  },
  status: {
    is: (value) => new StatusIs(value),
    isNot: (value) => new StatusIsNot(value),
  },
  assigneeId: {
    is: (value) => new AssigneeIdIs(value),
    isNot: (value) => new AssigneeIdIsNot(value),
  },
}

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
