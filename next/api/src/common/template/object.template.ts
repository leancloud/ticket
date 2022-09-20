import { StringTemplate } from './string.template';
import { Template } from './types';

export class ObjectTemplate<T> implements Template<T> {
  private stringTemplate?: StringTemplate;

  constructor(
    private object: T,
    private getValue: (object: T) => string,
    private setValue: (object: T, value: string) => void
  ) {}

  parse() {
    this.stringTemplate = new StringTemplate(this.getValue(this.object));
    return this.stringTemplate.parse();
  }

  getVariableNames() {
    if (this.stringTemplate) {
      return this.stringTemplate.getVariableNames();
    }
    return [];
  }

  render(values: Record<string, string | undefined>) {
    if (this.stringTemplate) {
      const s = this.stringTemplate.render(values);
      this.setValue(this.object, s);
    }
    return this.object;
  }
}
