import { z } from 'zod';

import { ViewCondition } from './ViewCondition';

interface TagData {
  private?: boolean;
  key: string;
  value: string;
}

export class TagsContains extends ViewCondition<TagData> {
  getCondition(): any {
    const tag = {
      key: this.data.key,
      value: this.data.value,
    };
    return this.data.private ? { privateTags: tag } : { tags: tag };
  }

  getZodSchema() {
    return z.object({
      private: z.boolean().optional(),
      key: z.string(),
      value: z.string(),
    });
  }
}
