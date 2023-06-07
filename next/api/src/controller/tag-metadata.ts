import { z } from 'zod';
import _ from 'lodash';

import {
  Body,
  Controller,
  CurrentUser,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  ResponseBody,
  UseMiddlewares,
} from '@/common/http';
import { FindModelPipe, ZodValidationPipe } from '@/common/pipe';
import { ACLBuilder } from '@/orm';
import { auth, adminOnly } from '@/middleware';
import { TagMetadata } from '@/model/TagMetadata';
import { User } from '@/model/User';
import { TagMetadtaResponse } from '@/response/tag-metadata';

const createTagMetadataSchema = z.object({
  key: z.string(),
  type: z.enum(['select', 'text']),
  values: z.array(z.string()),
  private: z.boolean(),
});

const updateTagMetadataSchema = createTagMetadataSchema.partial();

type CreateTagMetadataData = z.infer<typeof createTagMetadataSchema>;

type UpdateTagMetadataData = z.infer<typeof updateTagMetadataSchema>;

@Controller('tag-metadatas')
@UseMiddlewares(auth)
export class TagMetadataController {
  @Get()
  @ResponseBody(TagMetadtaResponse)
  async findAll(@CurrentUser() currentUser: User) {
    return TagMetadata.queryBuilder().limit(1000).find(currentUser.getAuthOptions());
  }

  @Post()
  @UseMiddlewares(adminOnly)
  async create(
    @CurrentUser() currentUser: User,
    @Body(new ZodValidationPipe(createTagMetadataSchema)) data: CreateTagMetadataData
  ) {
    const ACL = new ACLBuilder().allowCustomerService('read', 'write').allowStaff('read');
    if (!data.private) {
      ACL.allow('*', 'read');
    }

    const tagMetadata = await TagMetadata.create(
      {
        ACL,
        key: data.key,
        type: data.type,
        values: data.type === 'select' ? data.values : undefined,
        isPrivate: data.private,
      },
      currentUser.getAuthOptions()
    );

    return {
      id: tagMetadata.id,
    };
  }

  @Patch(':id')
  @UseMiddlewares(adminOnly)
  async update(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(TagMetadata)) tagMetadata: TagMetadata,
    @Body(new ZodValidationPipe(updateTagMetadataSchema)) data: UpdateTagMetadataData
  ) {
    let ACL: ACLBuilder | undefined = undefined;
    if (data.private !== undefined) {
      ACL = new ACLBuilder().allowCustomerService('read', 'write').allowStaff('read');
      if (!data.private) {
        ACL.allow('*', 'read');
      }
    }

    const type = data.type ?? tagMetadata.type;

    await tagMetadata.update(
      {
        ACL,
        key: data.key,
        type: data.type,
        values: type === 'text' ? null : data.values,
        isPrivate: data.private,
      },
      currentUser.getAuthOptions()
    );
  }

  @Delete(':id')
  @UseMiddlewares(adminOnly)
  async delete(
    @CurrentUser() currentUser: User,
    @Param('id', new FindModelPipe(TagMetadata)) tagMetadata: TagMetadata
  ) {
    await tagMetadata.delete(currentUser.getAuthOptions());
    return {};
  }
}
