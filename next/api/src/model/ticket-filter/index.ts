import AV from 'leancloud-storage';

import { Query } from '../../query';

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
  userIds?: string[];
  groupIds?: string[];
  filters: Filters;

  constructor(data: {
    id: string;
    name: string;
    userIds?: string[];
    groupIds?: string[];
    filters: Filters;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.userIds = data.userIds;
    this.groupIds = data.groupIds;
    this.filters = data.filters;
  }

  static className = 'TicketFilter';

  static fromAVObject(object: AV.Object) {
    return new TicketFilter({
      id: object.id!,
      name: object.get('name'),
      userIds: object.get('userIds') ?? undefined,
      groupIds: object.get('groupIds') ?? undefined,
      filters: object.get('filters'),
    });
  }

  static query() {
    return new Query(TicketFilter);
  }

  static async create(data: {
    name: string;
    userIds?: string[];
    groupIds?: string[];
    filters: Filters;
  }) {
    const obj = new AV.Object(TicketFilter.className, {
      ACL: {
        'role:customerService': { read: true, write: true },
      },
      name: data.name,
      userIds: data.userIds,
      groupIds: data.groupIds,
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
    userIds?: string[] | null;
    groupIds?: string[] | null;
    filters?: Filters;
  }) {
    const obj = AV.Object.createWithoutData(TicketFilter.className, this.id);
    if (data.name) {
      obj.set('name', data.name);
    }
    if (data.userIds) {
      obj.set('userIds', data.userIds);
    } else if (data.userIds === null) {
      obj.unset('userIds');
    }
    if (data.groupIds) {
      obj.set('groupIds', data.groupIds);
    } else if (data.groupIds === null) {
      obj.unset('groupIds');
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
