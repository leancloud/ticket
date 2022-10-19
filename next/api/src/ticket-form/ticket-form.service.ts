import _ from 'lodash';
import { Cache, RedisStore } from '@/cache';
import { HttpError, NotFoundError } from '@/common/http';
import { TicketField } from '@/model/TicketField';
import { TicketForm } from '@/model/TicketForm';
import { Category } from '@/model/Category';
import ticketFormNoteService from './ticket-form-note/ticket-form-note.service';
import {
  CreateTicketFormData,
  ListTicketFormOptions,
  TicketFormItem,
  UpdateTicketFormData,
} from './types';

const totalCountCache = new Cache([
  new RedisStore({
    prefix: 'cache:TicketForm:count',
    ttl: 60 * 60, // 1 hour
  }),
]);

class TicketFormService {
  list(options: ListTicketFormOptions) {
    const qb = TicketForm.queryBuilder();
    qb.paginate(options.page, options.pageSize);
    options.orderBy.forEach(({ key, order }) => qb.orderBy(key, order));
    return qb.find({ useMasterKey: true });
  }

  async getTotalCount() {
    const cached = await totalCountCache.get<number>('');
    if (cached) {
      return cached;
    }

    const qb = TicketForm.queryBuilder();
    const totalCount = await qb.count({ useMasterKey: true });

    await totalCountCache.set('', totalCount);

    return totalCount;
  }

  async create(data: CreateTicketFormData) {
    const _data: CreateTicketFormData = {
      title: data.title,
    };

    if (data.items) {
      await this.checkItems(data.items);
      _data.items = data.items;
      _data.fieldIds = data.items.filter((item) => item.type === 'field').map((item) => item.id);
    } else if (data.fieldIds) {
      await this.checkFieldIds(data.fieldIds);
      _data.fieldIds = data.fieldIds;
      _data.items = data.fieldIds.map((fieldId) => ({ type: 'field', id: fieldId }));
    } else {
      data.fieldIds = [];
    }

    const form = await TicketForm.create({ ..._data, ACL: {} }, { useMasterKey: true });

    await totalCountCache.del('');

    return form;
  }

  get(id: string) {
    return TicketForm.find(id, { useMasterKey: true });
  }

  async mustGet(id: string) {
    const form = await this.get(id);
    if (!form) {
      throw new NotFoundError(`ticket form ${id} does not exist`);
    }
    return form;
  }

  async update(id: string, data: UpdateTicketFormData) {
    const form = await this.mustGet(id);

    if (_.isEmpty(data)) {
      return;
    }

    const _data: Record<string, any> = {
      ACL: {},
      title: data.title,
    };

    if (data.items) {
      await this.checkItems(data.items);
      _data.items = data.items;
      _data.fieldIds = data.items.filter((item) => item.type === 'field').map((item) => item.id);
    } else if (data.fieldIds) {
      await this.checkFieldIds(data.fieldIds);
      _data.fieldIds = data.fieldIds;
      _data.items = null;
    }

    return form.update(_data, { useMasterKey: true });
  }

  async delete(id: string) {
    const form = await this.mustGet(id);

    const categoryUseThatForm = await Category.queryBuilder()
      .where('form', '==', form.toPointer())
      .first();
    if (categoryUseThatForm) {
      throw new HttpError(409, `ticket form ${form.id} is being used by some categories`);
    }

    await form.delete({ useMasterKey: true });
    await totalCountCache.del('');
  }

  private async checkFieldIds(fieldIds: string[]) {
    if (fieldIds.length === 0) {
      return;
    }
    const fields = await TicketField.queryBuilder()
      .where('objectId', 'in', fieldIds)
      .find({ useMasterKey: true });
    const fieldById = _.keyBy(fields, (field) => field.id);
    const missingId = fieldIds.find((id) => !fieldById[id]);
    if (missingId) {
      throw new HttpError(400, `ticket field ${missingId} does not exist`);
    }
  }

  private async checkNoteIds(noteIds: string[]) {
    if (noteIds.length === 0) {
      return;
    }

    const notes = await ticketFormNoteService.getSome(noteIds);

    const inactiveNote = notes.find((note) => !note.active);
    if (inactiveNote) {
      throw new HttpError(400, `ticket form note ${inactiveNote.id} is inactive`);
    }

    const noteById = _.keyBy(notes, (note) => note.id);
    const missingId = noteIds.find((id) => !noteById[id]);
    if (missingId) {
      throw new HttpError(400, `ticket form note ${missingId} does not exist`);
    }
  }

  private splitItems(items: TicketFormItem[]) {
    const fieldIds: string[] = [];
    const noteIds: string[] = [];
    items.forEach(({ id, type }) => {
      switch (type) {
        case 'field':
          fieldIds.push(id);
          break;
        case 'note':
          noteIds.push(id);
          break;
      }
    });
    return { fieldIds, noteIds };
  }

  private async checkItems(items: TicketFormItem[]) {
    const { fieldIds, noteIds } = this.splitItems(items);
    await this.checkFieldIds(fieldIds);
    await this.checkNoteIds(noteIds);
  }
}

export default new TicketFormService();
