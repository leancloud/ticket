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

  toJSON() {
    return {
      id: this.id,
      name: this.name,
    };
  }
}
