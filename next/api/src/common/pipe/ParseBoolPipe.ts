export class ParseBoolPipe {
  private keepUndefined?: boolean;

  constructor(config: { keepUndefined?: boolean }) {
    this.keepUndefined = config.keepUndefined;
  }

  static transform(data: any): boolean {
    if (data === '0' || data === 'false') {
      return false;
    }
    return !!data;
  }

  transform(data: any): boolean | undefined {
    if (data === undefined && this.keepUndefined) {
      return data;
    }
    return ParseBoolPipe.transform(data);
  }
}
