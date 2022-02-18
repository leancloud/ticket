import { Controller, Get, Param, Query, ResponseBody, UseMiddlewares } from '@/common/http';
import { FindModelPipe, ParseCsvPipe } from '@/common/pipe';
import { auth, customerServiceOnly } from '@/middleware';
import { File } from '@/model/File';
import { FileResponse } from '@/response/file';

@Controller('files')
export class FileController {
  @Get()
  @UseMiddlewares(auth, customerServiceOnly)
  @ResponseBody(FileResponse)
  async findSome(@Query('id', ParseCsvPipe) ids: string[] | undefined) {
    const query = File.queryBuilder();
    if (ids) {
      query.where('objectId', 'in', ids);
    }
    return query.find({ useMasterKey: true });
  }

  @Get(':id')
  @UseMiddlewares(auth, customerServiceOnly)
  @ResponseBody(FileResponse)
  async findOne(@Param('id', new FindModelPipe(File, { useMasterKey: true })) file: File) {
    return file;
  }
}
