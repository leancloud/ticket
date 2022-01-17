import { UserResponse } from './user';

export class CustomerServiceResponse extends UserResponse {
  toJSON() {
    return {
      ...super.toJSON(),
      categoryIds: this.user.categoryIds ?? [],
    };
  }
}
