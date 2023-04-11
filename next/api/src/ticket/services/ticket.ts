import { categoryService } from '@/category';
import { User } from '@/model/User';
import { TicketCreator } from '../TicketCreator';

export class TicketService {
  async createTicketFromEmail(author: User, categoryId: string, title?: string, content?: string) {
    const category = await categoryService.findOne(categoryId);
    if (!category) {
      // TODO: 搞个 MissingEntityError
      throw new Error(`Category ${categoryId} does not exist`);
    }

    const creator = new TicketCreator();
    creator.setAuthor(author);
    creator.setCategory(category);
    creator.setTitle(title ?? category.name);
    creator.setContent(content ?? '');
    creator.setChannel('email');

    const ticket = await creator.create(author);
    return ticket;
  }
}

export const ticketService = new TicketService();
