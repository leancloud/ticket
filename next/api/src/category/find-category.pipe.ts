import { HttpError } from '@/common/http';
import { categoryService } from './category.service';

export class FindCategoryPipe {
  static async transform(id: string) {
    const category = await categoryService.findOne(id);
    if (!category) {
      throw new HttpError(404, `Category ${id} is not exist`);
    }
    return category;
  }
}
