export interface CategoryData {
  id: string;
  name: string;
}

export class Category {
  readonly id: string;
  readonly name: string;

  constructor(data: CategoryData) {
    this.id = data.id;
    this.name = data.name;
  }
}
