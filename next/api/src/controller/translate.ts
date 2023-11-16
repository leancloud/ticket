import { z } from 'zod';
import axios from 'axios';

import { Body, Controller, HttpError, Post } from '@/common/http';
import { ZodValidationPipe } from '@/common/pipe';

const translateSchema = z.object({
  text: z.string(),
});

@Controller('translate')
export class TranslateController {
  private fanyiToken = process.env.FANYI_TOKEN;

  @Post()
  async translate(
    @Body(new ZodValidationPipe(translateSchema)) { text }: z.infer<typeof translateSchema>
  ) {
    if (!this.fanyiToken) {
      throw new HttpError(400, 'translation service is not configured');
    }

    const res = await axios.post(
      'https://fanyi.leanapp.cn/',
      { text },
      {
        headers: {
          'x-fanyi-token': this.fanyiToken,
        },
      }
    );

    return res.data;
  }
}
