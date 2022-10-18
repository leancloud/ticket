import { Cache, RedisStore } from '@/cache';
import { NotFoundError } from '@/common/http';
import { TicketFormNote } from './ticket-form-note.entity';
import {
  CreateTicketFormNoteData,
  ListTicketFormNoteOptions,
  UpdateTicketFormNoteData,
} from './types';

const totalCountCache = new Cache([
  new RedisStore({
    prefix: 'cache:TicketFormNote:count',
    ttl: 60 * 60, // 1 hour
  }),
]);

class TicketFormNoteService {
  list({ page, pageSize, active }: ListTicketFormNoteOptions) {
    const qb = TicketFormNote.queryBuilder();
    if (active !== undefined) {
      qb.where('active', '==', active);
    }
    return qb.paginate(page, pageSize).find({ useMasterKey: true });
  }

  async getTotalCount(options: { active?: boolean } = {}) {
    const cached = await totalCountCache.get<number>(options);
    if (cached !== undefined) {
      return cached;
    }

    const qb = TicketFormNote.queryBuilder();
    if (options.active !== undefined) {
      qb.where('active', '==', options.active);
    }
    const totalCount = await qb.count({ useMasterKey: true });

    await totalCountCache.set(options, totalCount);

    return totalCount;
  }

  async create(data: CreateTicketFormNoteData) {
    const note = TicketFormNote.create(
      {
        ...data,
        ACL: {},
        active: true,
      },
      { useMasterKey: true }
    );
    await totalCountCache.del([{ active: true }, { active: undefined }]);
    return note;
  }

  get(id: string) {
    return TicketFormNote.find(id, { useMasterKey: true });
  }

  async mustGet(id: string) {
    const note = await this.get(id);
    if (!note) {
      throw new NotFoundError(`ticket form note ${id} does not exist`);
    }
    return note;
  }

  async update(id: string, data: UpdateTicketFormNoteData) {
    const note = await this.mustGet(id);
    await note.update(data, { useMasterKey: true });
    if (data.active !== undefined) {
      await totalCountCache.del([{ active: true }, { active: false }, { active: undefined }]);
    }
  }
}

export default new TicketFormNoteService();
