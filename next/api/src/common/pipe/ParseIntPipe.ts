export class ParseIntPipe {
  private min?: number;
  private max?: number;

  constructor(config: { min?: number; max?: number }) {
    this.min = config.min;
    this.max = config.max;
  }

  static transform(data: any): number | undefined {
    const num = parseInt(data);
    if (Number.isNaN(num)) {
      return;
    }
    return num;
  }

  transform(data: any): number | undefined {
    let num = ParseIntPipe.transform(data);
    if (num === undefined) {
      return;
    }
    if (this.min !== undefined) {
      num = Math.max(this.min, num);
    }
    if (this.max !== undefined) {
      num = Math.min(this.max, num);
    }
    return num;
  }
}
