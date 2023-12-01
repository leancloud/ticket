import _ from 'lodash';

import { Controller, Get } from '@/common/http';
import { Locales, ILocale } from '@/common/http/handler/param/locale';
import { Config } from '@/config';
import { dynamicContentService } from '@/dynamic-content';

@Controller('evaluation-tag')
export class EvaluationTagController {
  @Get()
  async getTag(@Locales() locale: ILocale) {
    const value = {
      positive: {
        options: [] as string[],
        required: false,
      },
      negative: {
        options: [] as string[],
        required: false,
      },
    };

    const config = await Config.get('evaluation');
    if (config && config.tag) {
      _.merge(value, config.tag);
    }

    await dynamicContentService.renderTasks(
      [value.positive.options, value.negative.options].flatMap((options) =>
        options.map((option, index) => ({
          getText: () => option,
          setText: (option: string) => (options[index] = option),
        }))
      ),
      locale.locales
    );

    return value;
  }
}
