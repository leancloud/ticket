export class StatusIs {
  protected value: number;

  constructor({ value }: { value: number }) {
    this.value = value;
  }

  getCondition(): any {
    return {
      status: this.value,
    };
  }
}

export class StatusIsNot extends StatusIs {
  getCondition(): any {
    return {
      status: {
        $ne: this.value,
      },
    };
  }
}
