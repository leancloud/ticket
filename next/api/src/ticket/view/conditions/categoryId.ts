import { Category } from '@/model/Category';

export class CategoryIdIs {
  protected value: string;

  constructor({ value }: { value: string }) {
    this.value = value;
  }

  getCondition(): any {
    return {
      category: Category.ptr(this.value),
    };
  }
}

export class CategoryIdIsNot extends CategoryIdIs {
  getCondition() {
    return {
      category: {
        $ne: Category.ptr(this.value),
      },
    };
  }
}
