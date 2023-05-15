export class ParseDatePipe {
  static transform(data?: string): Date | undefined {
    if (data) {
      const date = new Date(data);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
}
