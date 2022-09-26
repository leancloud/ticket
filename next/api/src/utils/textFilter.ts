import { retry } from '@/cloud/utils';
import axios from 'axios';
import { createHash } from 'node:crypto';

export interface FilterOptions {
  requestOptions: {
    user_id: string;
    nickname?: string;
    ip?: string;
  };
  escape?: boolean;
}

export class TextFilterService {
  private maxRetries = Number(process.env.TEXT_FILTER_MAX_RETRY) || 3;
  private isServerDown = false;
  private serverRecoveryTimeout = 60 * 1000;

  private setServerDown() {
    this.isServerDown = true;
    setTimeout(() => {
      this.isServerDown = false;
    }, this.serverRecoveryTimeout);
  }

  async filter(input: string, { escape = true, requestOptions }: FilterOptions) {
    if (!input || this.isServerDown) return input;

    const {
      TDS_TEXT_FILTER_HOST,
      TDS_TEXT_FILTER_SCENE,
      TDS_CLIENT_ID,
      TDS_SERVER_SECRET,
    } = process.env;

    const sha1 = createHash('sha1').update(input).digest('hex');

    try {
      return await retry(async () => {
        const res = await axios.post<{
          hint: { hit_words: { positions: { start_index: number; end_index: number } }[] };
        }>(
          '/v2/text/check',
          {
            scene: TDS_TEXT_FILTER_SCENE as string,
            data: {
              ...requestOptions,
              user_id: `ticket-${requestOptions.user_id}`,
              text: input,
              data_id: sha1,
            },
          },
          {
            baseURL: TDS_TEXT_FILTER_HOST as string,
            headers: {
              'X-Client-ID': TDS_CLIENT_ID as string,
              'X-Server-Secret': TDS_SERVER_SECRET as string,
              'Content-Type': 'application/json',
            },
            timeout: 1000,
          }
        );
        const [filteredText, lastEnd] = res.data.hint.hit_words.reduce<[string, number]>(
          ([res, lastEnd], { positions: { start_index, end_index } }) => [
            `${res}${input.slice(lastEnd, start_index)}${(escape ? '\\*' : '*').repeat(
              end_index - start_index
            )}`,
            end_index,
          ],
          ['', 0]
        );
        return filteredText + input.slice(lastEnd);
      }, this.maxRetries);
    } catch (err) {
      console.warn(String(err));
      this.setServerDown();
      console.warn(
        `Text filter server is down, skip filtering for ${this.serverRecoveryTimeout} ms.`
      );
      return input;
    }
  }
}

export const textFilterService = new TextFilterService();
