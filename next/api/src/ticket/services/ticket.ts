import { categoryService } from '@/category';
import { User } from '@/model/User';
import { TicketCreator } from '../TicketCreator';
import { dynamicContentService } from '@/dynamic-content';

export class TicketService {
  async createTicketFromEmail(
    author: User,
    categoryId: string,
    title?: string,
    content?: string,
    fileIds?: string[]
  ) {
    const category = await categoryService.findOne(categoryId);
    if (!category) {
      // TODO: 搞个 MissingEntityError
      throw new Error(`Category ${categoryId} does not exist`);
    }

    const creator = new TicketCreator();
    creator.setAuthor(author);
    creator.setCategory(category);
    creator.setTitle(title ?? (await dynamicContentService.render(category.name)));
    creator.setContent(content ?? '');
    creator.setChannel('email');
    if (fileIds) {
      creator.setFileIds(fileIds);
    }

    const ticket = await creator.create(author);
    return ticket;
  }
}

export const ticketService = new TicketService();
