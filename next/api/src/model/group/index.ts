import AV from 'leancloud-storage';

import { Query } from '../../query';

export class Group {
  id: string;
  roleId: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    roleId: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.roleId = data.roleId;
    this.name = data.name;
    this.description = data.description;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static className = 'Group';

  static fromAVObject(object: AV.Object) {
    return new Group({
      id: object.id!,
      roleId: object.get('role').id,
      name: object.get('name'),
      description: object.get('description'),
      createdAt: object.createdAt!,
      updatedAt: object.updatedAt!,
    });
  }

  static ptr(id: string) {
    return { __type: 'Pointer', className: Group.className, objectId: id };
  }

  static query() {
    return new Query(Group);
  }

  static async findByUser(user: string | { id: string }): Promise<Group[]> {
    const userId = typeof user === 'string' ? user : user.id;

    const groupRoleQuery = new AV.Query(AV.Role)
      .startsWith('name', 'group_')
      .equalTo('users', { __type: 'Pointer', className: '_User', objectId: userId });
    const groupRoles = await groupRoleQuery.find({ useMasterKey: true });

    return Group.query().where('role', 'in', groupRoles).get({ useMasterKey: true });
  }
}
