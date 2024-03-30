import { z } from 'zod';
import axios from 'axios';
import { Context } from 'koa';

import {
  Body,
  Controller,
  Ctx,
  CurrentUser,
  Get,
  Param,
  Post,
  Query,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { FindModelPipe, ParseCsvPipe, ZodValidationPipe } from '@/common/pipe';
import { auth, staffOnly } from '@/middleware';
import { File } from '@/model/File';
import { User } from '@/model/User';
import { FileResponse } from '@/response/file';

@Controller('files')
export class FileController {
  @Get()
  @UseMiddlewares(auth, staffOnly)
  @ResponseBody(FileResponse)
  async findSome(@Query('id', ParseCsvPipe) ids: string[] | undefined) {
    const query = File.queryBuilder();
    if (ids) {
      query.where('objectId', 'in', ids);
    }
    return query.find({ useMasterKey: true });
  }

  @Get(':id')
  @UseMiddlewares(auth, staffOnly)
  @ResponseBody(FileResponse)
  async findOne(@Param('id', new FindModelPipe(File, { useMasterKey: true })) file: File) {
    return file;
  }

  @Get(':id/content')
  @UseMiddlewares(auth, staffOnly)
  async getFileContent(
    @Ctx() ctx: Context,
    @Param('id', new FindModelPipe(File, { useMasterKey: true })) file: File
  ) {
    const res = await axios.get(file.url, {
      responseType: 'stream',
    });
    ctx.set('Content-Type', res.headers['content-type']);
    return res.data;
  }
}

const getFileNameFromURL = (url: string) => decodeURI(url).split('/').pop();

const externalFileschema = z.array(
  z.object({
    url: z.string(),
    name: z.string().optional(),
    metaData: z.record(z.any()).optional(),
    type: z.string().optional(),
  })
);
type ExternalFilesSchema = z.infer<typeof externalFileschema>;

@UseMiddlewares(auth)
@Controller('external-files')
export class ExternalFileController {
  @Post()
  async batchSave(
    @CurrentUser() currentUser: User,
    @Body(new ZodValidationPipe(externalFileschema)) externalFiles: ExternalFilesSchema
  ) {
    const files = await File.createSome(
      externalFiles.map(({ url, name, metaData, type }) => ({
        url,
        name: name ?? getFileNameFromURL(url),
        mime: type,
        metaData: { ...metaData, owner: currentUser.id, external: true },
      }))
    );
    return files.map((file) => file.id);
  }
}
