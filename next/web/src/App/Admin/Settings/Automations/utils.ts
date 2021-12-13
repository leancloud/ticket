import { Condition } from '@/api/trigger';

interface ConditionGroup {
  type: 'all' | 'any';
  conditions: Condition[];
}

function isConditionGroup(condition: Condition): condition is ConditionGroup {
  return condition.type === 'all' || condition.type === 'any';
}

function makeAnyGroup(condition: Condition): ConditionGroup {
  return {
    type: 'any',
    conditions: [condition],
  };
}

export function encodeCondition(condition: Condition): Condition {
  if (isConditionGroup(condition)) {
    if (condition.conditions.length === 1) {
      return encodeCondition(condition.conditions[0]);
    } else {
      return {
        ...condition,
        conditions: condition.conditions.map(encodeCondition),
      };
    }
  }
  return condition;
}

export function decodeCondition(condition: Condition): Condition {
  if (!isConditionGroup(condition)) {
    return makeAnyGroup(makeAnyGroup(condition));
  }
  if (condition.conditions.length) {
    if (condition.conditions.some(isConditionGroup)) {
      return {
        ...condition,
        conditions: condition.conditions.map((c) => {
          if (isConditionGroup(c)) {
            return c;
          }
          return makeAnyGroup(c);
        }),
      };
    }
    return makeAnyGroup(condition);
  }
  return condition;
}
