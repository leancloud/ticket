import { Template } from './types';

export interface Variable {
  name: string;
  start: number;
  end: number;
}

const VARIABLE_PATTERN = /{{\s*((?:[a-zA-Z]+\.)?[a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;

export class StringTemplate implements Template<string> {
  private variables: Variable[] = [];

  constructor(public source: string) {}

  parse() {
    this.variables = [];
    const matchResults = this.source.matchAll(VARIABLE_PATTERN);
    for (const result of matchResults) {
      this.variables.push({
        name: result[1],
        start: result.index!,
        end: result.index! + result[0].length,
      });
    }
    return this.variables.length > 0;
  }

  getVariableNames() {
    return this.variables.map((v) => v.name);
  }

  render(values: Record<string, string | undefined>) {
    if (this.variables.length === 0) {
      return this.source;
    }

    let s = '';

    this.variables.forEach((variable, index, variables) => {
      if (index === 0) {
        s += this.source.slice(0, variable.start);
      } else {
        s += this.source.slice(variables[index - 1].end, variable.start);
      }
      s += values[variable.name] ?? '';
    });

    const lastVar = this.variables[this.variables.length - 1];
    s += this.source.slice(lastVar.end);

    this.source = s;

    return s;
  }
}
