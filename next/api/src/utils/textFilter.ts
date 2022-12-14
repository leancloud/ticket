import { retry } from '@/cloud/utils';
import axios from 'axios';
import { createHash } from 'node:crypto';
import type { ExtractArrayType } from './types';

export interface FilterOptions {
  user_id: string;
  nickname?: string;
  ip?: string;
}

export interface FilterResult {
  escape: string;
  unescape: string;
}

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
      return;
    }

    this.host = envVars['TDS_TEXT_FILTER_HOST'] as string;
    this.clientId = envVars['TDS_CLIENT_ID'] as string;
    this.scene = envVars['TDS_TEXT_FILTER_SCENE'] as string;
    this.serverSecret = envVars['TDS_SERVER_SECRET'] as string;
    this.serverRecoveryTimeout = (Number(process.env.TEXT_FILTER_RECOVERY_TIMEOUT) || 60) * 1000;
  }

  private setServerDown() {
    this.isServerDown = true;
    setTimeout(() => {
      this.isServerDown = false;
    }, this.serverRecoveryTimeout);
  }

  /**
   *
   * @param input
   * @param {FilterOptions} filterOptions
   * @returns {FilterResult}
   *
   * ## Example
   *
   * ```typescript
   * const { escape, unescape } = await filter(...);
   * escape === '\\*\\*' // true
   * unescape === '**' // true
   * ```
   */
  async filter(input: string, filterOptions: FilterOptions): Promise<FilterResult> {
    if (!input || this.isServerDown || this.disable) return { escape: input, unescape: input };

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
              ...filterOptions,
              user_id: `ticket-${filterOptions.user_id}`,
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
        const [
          filteredTextWithEscape,
          filteredTextWithoutEscape,
          lastEnd,
        ] = res.data.hint.hit_words.reduce<[string, string, number]>(
          ([resWithEscape, resWithoutEscape, lastEnd], { positions: { start_index, end_index } }) =>
            end_index > lastEnd
              ? [
                  `${resWithEscape}${input.slice(lastEnd, start_index)}${'\\*'.repeat(
                    end_index - Math.max(start_index, lastEnd)
                  )}`,
                  `${resWithoutEscape}${input.slice(lastEnd, start_index)}${'*'.repeat(
                    end_index - Math.max(start_index, lastEnd)
                  )}`,
                  end_index,
                ]
              : [resWithEscape, resWithoutEscape, lastEnd],
          ['', '', 0]
        );
        return {
          escape: filteredTextWithEscape + input.slice(lastEnd),
          unescape: filteredTextWithoutEscape + input.slice(lastEnd),
        };
      }, this.maxRetries);
    } catch (err) {
      console.warn(String(err));
      this.setServerDown();
      console.warn(
        `Text filter server is down, skip filtering for ${this.serverRecoveryTimeout} ms.`
      );
      return { escape: input, unescape: input };
    }
  }
}

export const textFilterService = new TextFilterService();
