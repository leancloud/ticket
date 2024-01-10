import { z } from 'zod';

import { Body, Controller, HttpError, Post } from '@/common/http';
import { ZodValidationPipe } from '@/common/pipe';
import { translateService } from '@/service/translate';

const translateSchema = z.object({
  text: z.string(),
});

@Controller('translate')
export class TranslateController {
  @Post()
  async translate(
    @Body(new ZodValidationPipe(translateSchema)) { text }: z.infer<typeof translateSchema>
  ) {
    const result = await translateService.translate(text);
    if (!result) {
      throw new HttpError(400, 'translation service is not configured');
    }
    return result;
  }
}
