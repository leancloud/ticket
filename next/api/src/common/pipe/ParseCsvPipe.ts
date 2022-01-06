export class ParseCsvPipe {
  static transform(data?: string): string[] | undefined {
    if (data) {
      return data.split(',');
    }
  }
}
