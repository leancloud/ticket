import axios from 'axios';
import { format } from 'date-fns';
import _ from 'lodash';
import { QueryCommand } from './query';

interface QueryData {
  estimateCount: number;
  fields: Array<{ name: string; type: string }>;
  results: Array<Record<string, string>>;
}
type ConditionValue = string | Date | number | Array<string | number> | null;

const http = axios.create({
  baseURL: `${process.env.LEANCLOUD_API_HOST}/datalake/v1`,
  headers: {
    'x-lc-key': `${process.env.LEANCLOUD_APP_MASTER_KEY},master`,
    'x-lc-id': `${process.env.LEANCLOUD_APP_ID}`,
  },
});

const escapeStr = (v: string) =>
  v
    .replace(/[\0\n\r\b\t\\\x1a]/g, (code) => {
      switch (code) {
        case '\0':
          return '\\0';
        case '\n':
          return '\\n';
        case '\b':
          return '\\b';
        case '\r':
          return '\\r';
        case '\t':
          return '\\t';
        case '\\':
          return '\\\\';
        case '\x1a':
          return '\\Z';
        default:
          console.error('uncovered case in replacer:', code);
          return ''; //logic error
      }
    })
    .replace(/'/g, "''");

export const quoteColumn = (value: string) => '`' + escapeStr(value) + '`';
export const quoteValue = (value: ConditionValue): string | number => {
  if (value === null || value === 'null') {
    return `''`;
  }
  if (_.isDate(value)) {
    value = format(value, 'yyyy-MM-dd HH:mm:ss');
  }
  if (typeof value === 'string') {
    return "'" + escapeStr(value) + "'";
  }
  if (_.isArray(value)) {
    return `(${value.map((v) => quoteValue(v)).join(',')})`;
  }
  return value + '';
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
  private orderExpressions: Array<string | [string, 'desc' | 'asc']>;
  private limitNumber: number | undefined;
  constructor() {
    this.tableName = undefined;
    this.selectList = [];
    this.conditions = new Conjunction();
    this.aggregations = [];
    this.orderExpressions = [];
    this.limitNumber = undefined;
  }
  from(table: string | ClickHouse) {
    if (table instanceof ClickHouse) {
      this.tableName = '(' + table.toSqlString() + ')';
    } else {
      this.tableName = table;
    }
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

  orderBy(...expressions: Array<string | [string, 'desc' | 'asc']>) {
    expressions.forEach((e) => this.orderExpressions.push(e));
    return this;
  }

  limit(number: number) {
    this.limitNumber = number;
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
    const groupBy = this.aggregations.length
      ? 'group by ' + this.aggregations.map((c) => quoteColumn(c)).join()
      : '';
    const orderBy = this.orderExpressions.length
      ? 'order by ' +
        this.orderExpressions
          .map((e) => (Array.isArray(e) ? quoteColumn(e[0]) + ' ' + e[1] : quoteColumn(e)))
          .join()
      : '';
    const limit = this.limitNumber ? `limit ${this.limitNumber}` : '';

    const parts = ['select', select_list, from, where, groupBy, orderBy, limit].filter(
      (v) => v != ''
    );
    return parts.join(' ');
  }

  async find() {
    const sql = this.toSqlString();
    return await ClickHouse.findWithSqlStr<QueryData>(sql);
  }

  static async findWithSqlStr<T extends { results: unknown }>(sql: string) {
    try {
      const { data } = await http.get<T>('/query', {
        params: {
          sql,
        },
      });
      return data.results as T['results'];
    } catch (error) {
      console.log(`[clickhouse query error, sql: ${sql}`);
      throw error;
    }
  }
}
