import { z } from 'zod';

import { ViewCondition } from './ViewCondition';

export class LanguageIs extends ViewCondition<{ value: string | null }> {
  getCondition(): any {
    return {
      language: this.data.value,
    };
  }

  getZodSchema() {
    return z.object({
      value: z.string().nullable(),
    });
  }
}

export class LanguageIsNot extends LanguageIs {
  getCondition(): any {
    return {
      language: {
        $ne: this.data.value,
      },
    };
  }
}
