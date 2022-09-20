import { Template } from './types';

type Values = Record<string, string>;

type ValuesGetter = (names: string[]) => Values | Promise<Values>;

export class AsyncDeepRenderer {
  constructor(
    private templates: Template<any>[],
    private valuesGetters: Record<string, ValuesGetter>,
    private maxDepth = 5
  ) {}

  async render() {
    const values: Values = {};
    let templates = [...this.templates];

    for (let i = 0; i < this.maxDepth; ++i) {
      const varNameSet = new Set<string>();
      templates = templates.filter((tmpl) => tmpl.parse());

      if (templates.length === 0) {
        break;
      }

      const varNamesByNs: Record<string, string[]> = {};

      templates.forEach((tmpl) => {
        tmpl.getVariableNames().forEach((name) => {
          if (values[name]) {
            // Break circle dependency
            values[name] = '';
          } else {
            varNameSet.add(name);
          }
        });
      });

      for (const name of varNameSet) {
        const ns = getNamespace(name);
        if (ns && this.valuesGetters[ns]) {
          const nameWithoutNs = name.slice(ns.length + 1);
          const vars = varNamesByNs[ns];
          if (vars) {
            vars.push(nameWithoutNs);
          } else {
            varNamesByNs[ns] = [nameWithoutNs];
          }
        }
      }

      for (const [ns, names] of Object.entries(varNamesByNs)) {
        const getter = this.valuesGetters[ns];
        const _values = await getter(names);
        Object.entries(_values).forEach(([name, value]) => {
          values[`${ns}.${name}`] = value;
        });
      }

      templates.forEach((tmpl) => tmpl.render(values));
    }
  }
}

function getNamespace(name: string) {
  const i = name.indexOf('.');
  if (i !== -1) {
    return name.slice(0, i);
  }
}
