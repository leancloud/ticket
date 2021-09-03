import AV from 'leancloud-storage';

export class File {
  id: string;
  name: string;
  mime: string;
  url: string;

  constructor(data: { id: string; name: string; mime: string; url: string }) {
    this.id = data.id;
    this.name = data.name;
    this.mime = data.mime;
    this.url = data.url;
  }

  static className = '_File';

  static fromAVObject(object: AV.Object) {
    return new File({
      id: object.id!,
      name: object.get('name'),
      mime: object.get('mime_type'),
      url: object.get('url'),
    });
  }
}
