enum STATE {
  INIT,
  FIELD,
  PROBE_VALUE,
  GT,
  GT_VALUE,
  GTE_VALUE,
  LT,
  LT_VALUE,
  LTE_VALUE,
  VALUE,
  VALUE_DOT,
  VALUE_RANGE,
}

type CompareType = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';

type TextType = 'text';

type RangeType = 'range';

export type Field =
  | {
      type: CompareType;
      key: string;
      value: string;
    }
  | {
      type: TextType;
      key: string;
    }
  | {
      type: RangeType;
      key: string;
      value: { from: string; to: string };
    };

function isBlank(ch: string): boolean {
  return ch === ' ' || ch === '\t';
}

export function parse(q: string): Field[] {
  const result: Field[] = [];

  if (!q) {
    return result;
  }

  let state = STATE.INIT;
  let key = '';
  let value = '';
  let rangeTo = '';

  const init = (field?: Field) => {
    state = STATE.INIT;
    key = '';
    value = '';
    rangeTo = '';
    if (field) {
      if (field.type === 'eq' && field.value.startsWith('-')) {
        field = {
          type: 'ne',
          key: field.key,
          value: field.value.slice(1),
        };
      }
      result.push(field);
    }
  };

  for (let i = 0; i < q.length; ++i) {
    const ch = q[i];

    switch (state) {
      case STATE.INIT:
        if (!isBlank(ch)) {
          state = STATE.FIELD;
          key = ch;
        }
        break;
      case STATE.FIELD:
        if (isBlank(ch)) {
          init({ type: 'text', key });
        } else if (ch === ':') {
          state = STATE.PROBE_VALUE;
        } else {
          key += ch;
        }
        break;
      case STATE.PROBE_VALUE:
        if (isBlank(ch)) {
          init({ type: 'eq', key, value });
        } else if (ch === '>') {
          state = STATE.GT;
        } else if (ch === '<') {
          state = STATE.LT;
        } else {
          state = STATE.VALUE;
          --i;
        }
        break;
      case STATE.GT:
        if (isBlank(ch)) {
          init({ type: 'gt', key, value });
        } else if (ch === '=') {
          state = STATE.GTE_VALUE;
        } else {
          state = STATE.GT_VALUE;
          value = ch;
        }
        break;
      case STATE.GT_VALUE:
        if (isBlank(ch)) {
          init({ type: 'gte', key, value });
        } else {
          value += ch;
        }
        break;
      case STATE.GTE_VALUE:
        if (isBlank(ch)) {
          init({ type: 'gte', key, value });
        } else {
          value += ch;
        }
        break;
      case STATE.LT:
        if (isBlank(ch)) {
          init({ type: 'lt', key, value });
        } else if (ch === '=') {
          state = STATE.LTE_VALUE;
        } else {
          state = STATE.LT_VALUE;
          value = ch;
        }
        break;
      case STATE.LT_VALUE:
        if (isBlank(ch)) {
          init({ type: 'lt', key, value });
        } else {
          value += ch;
        }
        break;
      case STATE.LTE_VALUE:
        if (isBlank(ch)) {
          init({ type: 'lte', key, value });
        } else {
          value += ch;
        }
        break;
      case STATE.VALUE:
        if (isBlank(ch)) {
          init({ type: 'eq', key, value });
        } else if (ch === '.') {
          state = STATE.VALUE_DOT;
        } else {
          value += ch;
        }
        break;
      case STATE.VALUE_DOT:
        if (isBlank(ch)) {
          init({ type: 'eq', key, value: value + '.' });
        } else if (ch === '.') {
          state = STATE.VALUE_RANGE;
        } else {
          state = STATE.VALUE;
          value += '.' + ch;
        }
        break;
      case STATE.VALUE_RANGE:
        if (isBlank(ch)) {
          init({ type: 'range', key, value: { from: value, to: rangeTo } });
        } else {
          rangeTo += ch;
        }
        break;
    }
  }

  switch (state) {
    case STATE.FIELD:
      init({ type: 'text', key });
      break;
    case STATE.PROBE_VALUE:
    case STATE.VALUE:
      init({ type: 'eq', key, value });
      break;
    case STATE.GT:
    case STATE.GT_VALUE:
      init({ type: 'gt', key, value });
      break;
    case STATE.GTE_VALUE:
      init({ type: 'gte', key, value });
      break;
    case STATE.LT:
    case STATE.LT_VALUE:
      init({ type: 'lt', key, value });
      break;
    case STATE.LTE_VALUE:
      init({ type: 'lte', key, value });
      break;
    case STATE.VALUE_DOT:
      init({ type: 'eq', key, value: value + '.' });
      break;
    case STATE.VALUE_RANGE:
      init({ type: 'range', key, value: { from: value, to: rangeTo } });
      break;
  }

  return result;
}
