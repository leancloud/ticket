import AV from 'leancloud-storage';

export interface GroupData {
  id: string;
  name: string;
}

export class Group {
  id: string;
  name: string;

  constructor(data: GroupData) {
    this.id = data.id;
    this.name = data.name;
  }

  static pointer(id: string) {
    return AV.Object.createWithoutData('Group', id);
  }

  static fromAVObject(object: AV.Object): Group {
    // TODO(sdjdd): check attributes
    return new Group({
      id: object.id!,
      name: object.get('name'),
    });
  }

  static async findForUser(id: string): Promise<Group[]> {
    const roleQuery = new AV.Query(AV.Role);
    roleQuery.startsWith('name', 'group_');
    roleQuery.equalTo('users', AV.Object.createWithoutData('_User', id));
    const roles = await roleQuery.find({ useMasterKey: true });

    const groupIds = roles.map((role) => role.getName().slice(6));
    const groupQuery = new AV.Query<AV.Object>('Group');
    groupQuery.containedIn('objectId', groupIds);
    const groups = await groupQuery.find({ useMasterKey: true });

    return groups.map(Group.fromAVObject);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
    };
  }
}
