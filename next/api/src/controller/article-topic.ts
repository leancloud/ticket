import { Context } from 'koa';
import { z } from 'zod';

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  HttpError,
  ResponseBody,
  StatusCode,
  UseMiddlewares,
  Pagination,
  Query,
  Ctx,
} from '@/common/http';
import { FindModelWithoutDeleteFlagPipe, ParseBoolPipe, ZodValidationPipe } from '@/common/pipe';
import { auth, adminOnly } from '@/middleware';
import { ArticleTopic } from '@/model/ArticleTopic';
import { ArticleTopicResponse } from '@/response/article-topic';
import { Category } from '@/model/Category';
import { dynamicContentService } from '@/dynamic-content';

const createArticleTopicSchema = z.object({
  name: z.string(),
  articleIds: z.array(z.string()),
  meta: z.record(z.any()).optional(),
});

const updateArticleTopicSchema = createArticleTopicSchema.partial();

type CreateArticleTopicData = z.infer<typeof createArticleTopicSchema>;

type UpdateArticleTopicData = z.infer<typeof updateArticleTopicSchema>;

@Controller('topics')
// /topics are restricted to CS-only. End users should access topics via related resouce APIs.
@UseMiddlewares(auth, adminOnly)
export class ArticleTopicController {
  @Post()
  @StatusCode(201)
  async create(
    @Body(new ZodValidationPipe(createArticleTopicSchema)) data: CreateArticleTopicData
  ) {
    const topic = await ArticleTopic.create(data, { useMasterKey: true });
    return {
      id: topic.id,
    };
  }

  @Get()
  @ResponseBody(ArticleTopicResponse)
  async findSome(
    @Ctx() ctx: Context,
    @Pagination() [page, pageSize]: [number, number],
    @Query('count', ParseBoolPipe) count: boolean,
    @Query('raw', ParseBoolPipe) raw: boolean
  ) {
    const query = ArticleTopic.queryBuilder()
      .where('deletedAt', 'not-exists')
      .paginate(page, pageSize);
    const topics = count
      ? await query.findAndCount({ useMasterKey: true }).then(([topics, count]) => {
          ctx.set('X-Total-Count', count.toString());
          return topics;
        })
      : await query.find({ useMasterKey: true });

    if (!raw) {
      await dynamicContentService.renderObjects(topics, ['name'], ctx.locales.locales);
    }

    return topics;
  }

  @Get(':id')
  @ResponseBody(ArticleTopicResponse)
  async findOne(
    @Ctx() ctx: Context,
    @Param('id', new FindModelWithoutDeleteFlagPipe(ArticleTopic)) topic: ArticleTopic,
    @Query('raw', ParseBoolPipe) raw: boolean
  ) {
    if (!raw) {
      await dynamicContentService.renderObjects([topic], ['name'], ctx.locales.locales);
    }
    return topic;
  }

  @Patch(':id')
  async update(
    @Param('id', new FindModelWithoutDeleteFlagPipe(ArticleTopic)) topic: ArticleTopic,
    @Body(new ZodValidationPipe(updateArticleTopicSchema)) data: UpdateArticleTopicData
  ) {
    await topic.update(data, { useMasterKey: true });
    return {};
  }

  @Delete(':id')
  async delete(@Param('id', new FindModelWithoutDeleteFlagPipe(ArticleTopic)) topic: ArticleTopic) {
    const associatedCategoryCount = await Category.query()
      .where('FAQs', '==', topic.toPointer())
      .count({ useMasterKey: true });
    if (associatedCategoryCount > 0) {
      throw new HttpError(400, `Topic "${topic.id}" is in use`, 'RESOURCE_IN_USE');
    }
    await topic.delete({ useMasterKey: true });
    return {};
  }
}
