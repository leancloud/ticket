import { File } from '@/model/File';

export class FileService {
  getFiles(ids: string[]) {
    return File.queryBuilder().where('objectId', 'in', ids).find({ useMasterKey: true });
  }
}

export const fileService = new FileService();
