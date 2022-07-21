import axios from 'axios';
import { format } from 'date-fns';
import _ from 'lodash';

import { QueryCommand } from './query';

interface QueryData {
  estimateCount: number;
  fields: Array<{ name: string; type: string }>;
  results: Array<Record<string, string>>;
}
type ConditionValue = string | Date | number | Array<string | number>;

const quoteColumn = (term: string) => '`' + term + '`';
const quoteValue = (value: ConditionValue): string | number => {
  if (_.isArray(value)) {
    return `(${value.map((v) => quoteValue(v)).join(',')})`;
  }
  if (_.isDate(value)) {
    value = format(value, 'yyyy-MM-dd HH:mm:ss');
  }
  return _.isString(value) ? `'${value}'` : value;
};

export class FunctionColumn {
  column: string;
  constructor(column: string) {
    this.column = column;
  }
}
type Operator = Omit<QueryCommand, 'not-in' | 'exists' | 'not-exists' | 'starts-with'>;

class Condition {
  value: string | number;
  operator: Operator;
  column: string;
  constructor(column: string | FunctionColumn, operator: Operator, value: ConditionValue) {
    this.column = column instanceof FunctionColumn ? column.column : quoteColumn(column);
    this.operator = operator;
    this.value = quoteValue(value);
  }
  toString() {
    return [this.column, this.operator, this.value].join(' ');
  }
}

class Conditions {
  conditions: Condition[];
  constructor(conditions: Condition[] = []) {
    this.conditions = conditions;
  }
  push(condition: Condition) {
    this.conditions.push(condition);
  }
  get length() {
    return this.conditions.length;
  }
}

class Conjunction extends Conditions {
  constructor(conditions: Condition[] = []) {
    super();
    this.conditions = conditions;
  }

  toString() {
    if (!this.conditions.length) return '';
    return this.conditions
      .map((condition) => {
        const s = condition.toString ? condition.toString() : condition;
        return '(' + s + ')';
      })
      .join(' and ');
  }
}

export class ClickHouse {
  private tableName: string | undefined;
  private selectList: string[];
  private aggregations: string[];
  private conditions: Conjunction;
  constructor() {
    this.tableName = undefined;
    this.selectList = [];
    this.conditions = new Conjunction();
    this.aggregations = [];
  }
  from(tableName: string) {
    this.tableName = tableName;
    return this;
  }

  select(...columns: string[]) {
    columns.forEach((col) => this.selectList.push(col));
    return this;
  }

  check(value?: ConditionValue) {
    if (value === undefined) {
      return false;
    }
    if (_.isArray(value) && value.length == 0) {
      return false;
    }
    return true;
  }

  where(column: string | FunctionColumn, value?: ConditionValue, operator: Operator = '==') {
    if (!this.check(value)) {
      return this;
    }
    this.conditions.push(new Condition(column, operator, value!));
    return this;
  }

  groupBy(...aggregations: string[]) {
    aggregations.forEach((aggregation) => this.aggregations.push(aggregation));
    return this;
  }

  toSqlString() {
    if (!this.tableName) {
      throw new Error('table name is required');
    }
    let select_list;
    if (this.selectList.length === 0) {
      select_list = '*';
    } else {
      select_list = this.selectList.join(',');
    }
    const from = `from ${this.tableName}`;
    const where = this.conditions.length ? 'where ' + this.conditions : '';
    const groupby = this.aggregations.length
      ? 'group by ' + this.aggregations.map((c) => quoteColumn(c)).join()
      : '';
    const parts = ['select', select_list, from, where, groupby].filter((v) => v != '');
    return parts.join(' ');
  }

  async query() {
    const sql = this.toSqlString();
    console.log('query sql', sql);
    try {
      const { data } = await axios.get<QueryData>(
        `${process.env.LEANCLOUD_API_HOST}/datalake/v1/query`,
        {
          params: {
            sql,
          },
          headers: {
            'x-lc-key': `${process.env.LEANCLOUD_APP_MASTER_KEY},master`,
            'x-lc-id': `${process.env.LEANCLOUD_APP_ID}`,
          },
        }
      );
      return data.results;
    } catch (error) {
      console.log(`[clickhouse query error, sql: ${sql}`);
      throw error;
    }
  }
}
