export interface Order {
  key: string;
  order: 'asc' | 'desc';
}

const ASC: 'asc' = 'asc';
const DESC: 'desc' = 'desc';

export class ParseOrderPipe {
  constructor(private keys: string[]) {}

  static parseOrder(key: string): Order {
    const order: Order = { key, order: ASC };
    if (key.endsWith('-asc')) {
      order.key = key.slice(0, -4);
    } else if (key.endsWith('-desc')) {
      order.key = key.slice(0, -5);
      order.order = DESC;
    }
    return order;
  }

  static transform(data?: string | string[]): Order[] | undefined {
    if (data !== undefined) {
      if (typeof data === 'string') {
        data = data.split(',');
      }
      return data.map(ParseOrderPipe.parseOrder);
    }
  }

  transform(data?: string | string[]): Order[] | undefined {
    return ParseOrderPipe.transform(data)?.filter(({ key }) => this.keys.includes(key));
  }
}
