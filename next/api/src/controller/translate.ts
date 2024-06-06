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
    const start = performance.now();
    let translateResult;
    try{
      translateResult = await translateService.translate(text);
    } finally {
      const end = performance.now();
      console.log(`translate ${text} cost ${end - start}ms, result: ${translateResult?.from}, ${translateResult?.text}`);
    }

    if (!translateResult) {
      throw new HttpError(400, 'translation service is not available');
    }
    return translateResult;
  }
}
