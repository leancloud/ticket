const STATE_INIT = 0
const STATE_FIELD = 10
const STATE_PROBE_VALUE = 20
const STATE_GT = 30
const STATE_GT_VALUE = 40
const STATE_GTE_VALUE = 50
const STATE_LT = 60
const STATE_LT_VALUE = 70
const STATE_LTE_VALUE = 80
const STATE_VALUE = 90
const STATE_VALUE_DOT = 100
const STATE_VALUE_RANGE = 110

function parse(q) {
  const result = {
    text: [],
    eq: {},
    gt: {},
    gte: {},
    lt: {},
    lte: {},
    range: {},
  }

  if (!q || typeof q !== 'string') {
    return result
  }

  let state = STATE_INIT
  let field = ''
  let value = ''
  let value2 = ''

  for (let i = 0; i < q.length; i++) {
    const ch = q[i]

    switch (state) {
      case STATE_INIT:
        if (!isBlank(ch)) {
          state = STATE_FIELD
          field = ch
        }
        break

      case STATE_FIELD:
        if (isBlank(ch)) {
          result.text.push(field)
          state = STATE_INIT
        } else if (ch === ':') {
          state = STATE_PROBE_VALUE
        } else {
          field += ch
        }
        break

      case STATE_PROBE_VALUE:
        if (isBlank(ch)) {
          result.eq[field] = ''
          state = STATE_INIT
        } else if (ch === '>') {
          state = STATE_GT
        } else if (ch === '<') {
          state = STATE_LT
        } else {
          state = STATE_VALUE
          value = ch
        }
        break

      case STATE_GT:
        if (isBlank(ch)) {
          result.gt[field] = ''
          state = STATE_INIT
        } else if (ch === '=') {
          state = STATE_GTE_VALUE
          value = ''
        } else {
          state = STATE_GT_VALUE
          value = ch
        }
        break

      case STATE_GT_VALUE:
        if (isBlank(ch)) {
          result.gt[field] = value
          state = STATE_INIT
        } else {
          value += ch
        }
        break

      case STATE_GTE_VALUE:
        if (isBlank(ch)) {
          result.gte[field] = value
          state = STATE_INIT
        } else {
          value += ch
        }
        break

      case STATE_LT:
        if (isBlank(ch)) {
          result.lt[field] = ''
          state = STATE_INIT
        } else if (ch === '=') {
          state = STATE_LTE_VALUE
          value = ''
        } else {
          state = STATE_LT_VALUE
          value = ch
        }
        break

      case STATE_LT_VALUE:
        if (isBlank(ch)) {
          result.lt[field] = value
          state = STATE_INIT
        } else {
          value += ch
        }
        break

      case STATE_LTE_VALUE:
        if (isBlank(ch)) {
          result.lte[field] = value
          state = STATE_INIT
        } else {
          value += ch
        }
        break

      case STATE_VALUE:
        if (isBlank(ch)) {
          result.eq[field] = value
          state = STATE_INIT
        } else if (ch === '.') {
          state = STATE_VALUE_DOT
        } else {
          value += ch
        }
        break

      case STATE_VALUE_DOT:
        if (isBlank(ch)) {
          result.eq[field] = value + '.'
          state = STATE_INIT
        } else if (ch === '.') {
          state = STATE_VALUE_RANGE
          value2 = ''
        } else {
          state = STATE_VALUE
          value += '.' + ch
        }
        break

      case STATE_VALUE_RANGE:
        if (isBlank(ch)) {
          result.range[field] = { from: value, to: value2 }
          state = STATE_INIT
        } else {
          value2 += ch
        }
        break
    }
  }

  switch (state) {
    case STATE_FIELD:
      result.text.push(field)
      break
    case STATE_PROBE_VALUE:
      result.eq[field] = ''
      break
    case STATE_GT:
      result.gt[field] = ''
      break
    case STATE_GT_VALUE:
      result.gt[field] = value
      break
    case STATE_GTE_VALUE:
      result.gte[field] = value
      break
    case STATE_LT:
      result.lt[field] = ''
      break
    case STATE_LT_VALUE:
      result.lt[field] = value
      break
    case STATE_LTE_VALUE:
      result.lte[field] = value
      break
    case STATE_VALUE:
      result.eq[field] = value
      break
    case STATE_VALUE_DOT:
      result.eq[field] = value + '.'
      break
    case STATE_VALUE_RANGE:
      result.range[field] = { from: value, to: value2 }
      break
  }

  return checkSortField(result)
}

function isBlank(ch) {
  return ch === ' ' || ch === '\t'
}

function checkSortField(result) {
  result.sort = []
  if (result.eq.sort) {
    result.eq.sort.split(',').forEach((key) => {
      let order = 'asc'
      if (key.endsWith('-asc')) {
        key = key.slice(0, -4)
      } else if (key.endsWith('-desc')) {
        key = key.slice(0, -5)
        order = 'desc'
      }
      result.sort.push({ key, order })
    })
    delete result.eq.sort
  }
  return result
}

module.exports = { parse }
