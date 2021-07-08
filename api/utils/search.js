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

function isBlank(ch) {
  return ch === ' ' || ch === '\t'
}

/**
 * @param {string} q
 * @returns {any[]}
 */
function parseQ(q) {
  const result = []

  if (!q || typeof q !== 'string') {
    return result
  }

  let state = STATE_INIT
  let field = ''
  let value = ''
  let value2 = ''

  const init = (item) => {
    state = STATE_INIT
    field = ''
    value = ''
    value2 = ''
    if (item) {
      if (item.type === 'eq' && item.field.startsWith('-')) {
        item.type = 'ne'
        item.field = item.field.slice(1)
      }
      result.push(item)
    }
  }

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
          init({ type: 'text', field })
        } else if (ch === ':') {
          state = STATE_PROBE_VALUE
        } else {
          field += ch
        }
        break

      case STATE_PROBE_VALUE:
        if (isBlank(ch)) {
          init({ type: 'eq', field, value })
        } else if (ch === '>') {
          state = STATE_GT
        } else if (ch === '<') {
          state = STATE_LT
        } else {
          state = STATE_VALUE
          value = ''
          i--
        }
        break

      case STATE_GT:
        if (isBlank(ch)) {
          init({ type: 'gt', field, value })
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
          init({ type: 'gt', field, value })
        } else {
          value += ch
        }
        break

      case STATE_GTE_VALUE:
        if (isBlank(ch)) {
          init({ type: 'gte', field, value })
        } else {
          value += ch
        }
        break

      case STATE_LT:
        if (isBlank(ch)) {
          init({ type: 'lt', field, value })
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
          init({ type: 'lt', field, value })
        } else {
          value += ch
        }
        break

      case STATE_LTE_VALUE:
        if (isBlank(ch)) {
          init({ type: 'lte', field, value })
        } else {
          value += ch
        }
        break

      case STATE_VALUE:
        if (isBlank(ch)) {
          init({ type: 'eq', field, value })
        } else if (ch === '.') {
          state = STATE_VALUE_DOT
        } else {
          value += ch
        }
        break

      case STATE_VALUE_DOT:
        if (isBlank(ch)) {
          init({ type: 'eq', field, value: value + '.' })
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
          init({ type: 'range', field, from: value, to: value2 })
        } else {
          value2 += ch
        }
        break
    }
  }

  switch (state) {
    case STATE_FIELD:
      init({ type: 'text', field })
      break
    case STATE_PROBE_VALUE:
    case STATE_VALUE:
      init({ type: 'eq', field, value })
      break
    case STATE_GT:
    case STATE_GT_VALUE:
      init({ type: 'gt', field, value })
      break
    case STATE_GTE_VALUE:
      init({ type: 'gte', field, value })
      break
    case STATE_LT:
    case STATE_LT_VALUE:
      init({ type: 'lt', field, value })
      break
    case STATE_LTE_VALUE:
      init({ type: 'lte', field, value })
      break
    case STATE_VALUE_DOT:
      init({ type: 'eq', field, value: value + '.' })
      break
    case STATE_VALUE_RANGE:
      init({ type: 'range', field, from: value, to: value2 })
      break
  }

  return result
}

function parseSort(value) {
  return value.split(',').map((key) => {
    let order = 'asc'
    if (key.endsWith('-asc')) {
      key = key.slice(0, -4)
    } else if (key.endsWith('-desc')) {
      key = key.slice(0, -5)
      order = 'desc'
    }
    return { key, order }
  })
}

/**
 *
 * @param {string} [q]
 * @returns {{
 *   text: string[];
 *   eq: Record<string, string>;
 *   ne: Record<string, string>;
 *   gt: Record<string, string>;
 *   gte: Record<string, string>;
 *   lt: Record<string, string>;
 *   lte: Record<string, string>;
 *   range: Record<string, { from: string; to: string }>;
 *   sort: { key: string; order: 'asc' | 'desc' }[];
 * }}
 */
function parse(q) {
  const result = {
    text: [],
    eq: {},
    ne: {},
    gt: {},
    gte: {},
    lt: {},
    lte: {},
    range: {},
    sort: [],
  }
  const itemByField = parseQ(q).reduce((map, item) => {
    map[item.field] = item
    return map
  }, {})
  Object.values(itemByField).forEach(({ type, field, value, from, to }) => {
    switch (type) {
      case 'text':
        result.text.push(field)
        break
      case 'eq':
        if (field === 'sort') {
          result.sort = parseSort(value)
        } else {
          result.eq[field] = value
        }
        break
      case 'ne':
        result.ne[field] = value
        break
      case 'gt':
        result.gt[field] = value
        break
      case 'gte':
        result.gte[field] = value
        break
      case 'lt':
        result.gt[field] = value
        break
      case 'lte':
        result.gte[field] = value
        break
      case 'range':
        result.range[field] = { from, to }
        break
    }
  })
  return result
}

module.exports = { parse }
