import { Category } from '@/model/Category';
import _ from 'lodash';
import { OpenAI } from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { z } from 'zod';

export const TicketClassifyPrompt = (categories: Category[]) => `
你是我的内容分类助手，我会为你提供各种分类和它们的描述，以及一个内容，我需要你帮助为内容分类，并给出你认为的置信度。
分类后输出如下 JSON 格式："""
{"category":"..","confidence":0.123456789}
"""
category 表示分类的 ID，confidence 表示你给出的置信度。 如果你觉得这个工单不属于任何分类，输出 null。

以下是各种分类的 ID 以及他们的含义，由 '-' 开头， ':' 后面是分类的描述，每个占一行：
${categories
  .map(
    ({ id, meta, hidden }) => !hidden && !!meta?.aiDescription && `- ${id}：${meta.aiDescription}`
  )
  .filter(Boolean)
  .join('\n')}
`;

const OpenAIOutputSchema = z.object({
  category: z.string(),
  confidence: z.number(),
});

export type TicketClassifyResult = z.infer<typeof OpenAIOutputSchema>;

export class OpenAIService {
  instance?: InstanceType<typeof OpenAI>;
  agent?: InstanceType<typeof HttpsProxyAgent>;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    const httpProxy = process.env.OPENAI_PROXY;

    if (!apiKey) {
      console.warn('OPENAI_API_KEY not provided, disabling openAIService...');
      return;
    }

    if (httpProxy) {
      this.agent = new HttpsProxyAgent(httpProxy);
    }

    this.instance = new OpenAI({ apiKey });
  }

  async classify(content: string, categories: Category[]) {
    if (!this.instance) {
      return undefined;
    }

    const categoryById = _.keyBy(categories, (c) => c.id);

    const SystemPrompt = TicketClassifyPrompt(categories);

    const UserPrompt = `内容："""\n${content}\n"""`;

    const res = await (async () => {
      try {
        const res = (
          await this.instance!.chat.completions.create(
            {
              response_format: {
                type: 'json_object',
              },
              model: process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: SystemPrompt,
                },
                {
                  role: 'user',
                  content: UserPrompt,
                },
              ],
              temperature: 0.6,
            },
            { timeout: 20 * 1000, httpAgent: this.agent }
          )
        ).choices[0].message?.content;

        if (res) {
          console.log(`OpenAI category classify: user=${content}, result=${res}`);
          try {
            return OpenAIOutputSchema.parse(JSON.parse(res.trim()));
          } catch {
            console.log(`parse GPT result error:`, res);
          }
        }
      } catch (err) {
        console.error(err);
        return;
      }
    })();

    if (res) {
      return categoryById[res.category];
    }
  }
}

export const openAIService = new OpenAIService();
