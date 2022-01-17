export class TrimPipe {
  static transform(str?: string): string | undefined {
    return str?.trim();
  }
}
