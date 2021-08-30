import AV from 'leancloud-storage';

import { Query } from '../../query';
import { Group } from '../group';
import { User } from '../user';

export interface Filters {
  assigneeIds?: string[];
  groupIds?: string[];
  createdAt?: string;
  rootCategoryId?: string;
  statuses?: number[];
}

export class TicketFilter {
  id: string;
  name: string;
  userId?: string;
  groupId?: string;
  filters: Filters;

  constructor(data: {
    id: string;
    name: string;
    userId?: string;
    groupId?: string;
    filters: Filters;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.userId = data.userId;
    this.groupId = data.groupId;
    this.filters = data.filters;
  }

  static className = 'TicketFilter';

  static fromAVObject(object: AV.Object) {
    return new TicketFilter({
      id: object.id!,
      name: object.get('name'),
      userId: object.get('user')?.id,
      groupId: object.get('group')?.id,
      filters: object.get('filters'),
    });
  }

  static query() {
    return new Query(TicketFilter);
  }

  static async create(data: { name: string; userId?: string; groupId?: string; filters: Filters }) {
    const obj = new AV.Object(TicketFilter.className, {
      ACL: {
        'role:customerService': { read: true, write: true },
      },
      name: data.name,
      user: data.userId ? User.ptr(data.userId) : undefined,
      group: data.groupId ? Group.ptr(data.groupId) : undefined,
      filters: data.filters,
    });

    await obj.save(null, { useMasterKey: true });
    return new TicketFilter({ ...data, id: obj.id! });
  }

  static async find(id: string) {
    const obj = await new AV.Query<AV.Object>(TicketFilter.className).get(id, {
      useMasterKey: true,
    });
    return TicketFilter.fromAVObject(obj);
  }

  async update(data: {
    name?: string;
    userId?: string | null;
    groupId?: string | null;
    filters?: Filters;
  }) {
    const obj = AV.Object.createWithoutData(TicketFilter.className, this.id);
    if (data.name) {
      obj.set('name', data.name);
    }
    if (data.userId !== undefined) {
      if (data.userId) {
        obj.set('user', User.ptr(data.userId));
      } else {
        obj.unset('user');
      }
    }
    if (data.groupId !== undefined) {
      if (data.groupId) {
        obj.set('group', Group.ptr(data.groupId));
      } else {
        obj.unset('group');
      }
    }
    if (data.filters) {
      obj.set('filters', data.filters);
    }
    await obj.save(null, { useMasterKey: true });
  }

  async delete() {
    await AV.Object.createWithoutData(TicketFilter.className, this.id).destroy({
      useMasterKey: true,
    });
  }
}
