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

type ExtractArrayType<T extends ArrayLike<unknown>> = T extends ArrayLike<infer Res> ? Res : never;

export class TextFilterService {
  private maxRetries = Number(process.env.TEXT_FILTER_MAX_RETRY) || 3;
  private isServerDown = false;
  private serverRecoveryTimeout = 60 * 1000;
  private disable = false;
  private host = '';
  private clientId = '';
  private serverSecret = '';
  private scene = '';

  constructor() {
    const envVarList = [
      'TDS_TEXT_FILTER_HOST',
      'TDS_TEXT_FILTER_SCENE',
      'TDS_CLIENT_ID',
      'TDS_SERVER_SECRET',
    ] as const;

    const envVars = envVarList.reduce(
      (acc, key) => ({ ...acc, [key]: process.env[key] }),
      {} as Record<ExtractArrayType<typeof envVarList>, string | undefined>
    );

    const lackEnvVars = Object.entries(envVars).filter(([, value]) => !value);

    if (lackEnvVars.length > 0) {
      console.warn(
        `Lack environment variable: ${lackEnvVars
          .map(([name]) => name)
          .join(', ')}, text filter disable.`
      );
      this.disable = true;
    }

    this.host = envVars['TDS_TEXT_FILTER_HOST'] as string;
    this.clientId = envVars['TDS_CLIENT_ID'] as string;
    this.scene = envVars['TDS_TEXT_FILTER_SCENE'] as string;
    this.serverSecret = envVars['TDS_SERVER_SECRET'] as string;
  }

  private setServerDown() {
    this.isServerDown = true;
    setTimeout(() => {
      this.isServerDown = false;
    }, this.serverRecoveryTimeout);
  }

  async filter(input: string, { escape = true, requestOptions }: FilterOptions) {
    if (!input || this.isServerDown || this.disable) return input;

    const sha1 = createHash('sha1').update(input).digest('hex');

    try {
      return await retry(async () => {
        const res = await axios.post<{
          hint: { hit_words: { positions: { start_index: number; end_index: number } }[] };
        }>(
          '/v2/text/check',
          {
            scene: this.scene,
            data: {
              ...requestOptions,
              user_id: `ticket-${requestOptions.user_id}`,
              text: input,
              data_id: sha1,
            },
          },
          {
            baseURL: this.host,
            headers: {
              'X-Client-ID': this.clientId,
              'X-Server-Secret': this.serverSecret,
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
