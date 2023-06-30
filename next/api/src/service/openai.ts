import { Category } from '@/model/Category';
import _ from 'lodash';
import { Configuration, OpenAIApi } from 'openai';

export const TicketClassifyPrompt = (categories: Category[]) => `
你是我的工单内容分类助手，我会为你提供各种分类以及它们的描述，以及一个工单的内容，我需要你帮助我将下面的这一个工单分到某一个分类中，并给出你认为的置信度。只按照我给出的格式输出，如果遇到问题可以输出 null。下面的输出 JSON 格式中，category 表示分类的名字，confidence 表示你给出的置信度，你可以给出对这个工单所有待选的分类，无需额外解释说明。
输出使用的 JSON 格式："""
[
  { "category": "..", "confidence": 0.123456789 }
  { "category": "..", "confidence": 0.12345678 }
]
"""
以下是各种分类的名字以及他们的含义，由 '-' 开头，每个占一行：
${categories
  .map(({ name, description }) => description && `- ${name}：${description}`)
  .filter(Boolean)
  .join('\n')}
`;

export interface TicketClassifyResult {
  category: string;
  confidence: number;
}

export class OpenAIService {
  active: boolean;
  instance: InstanceType<typeof OpenAIApi>;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.instance = new OpenAIApi(new Configuration({ apiKey }));

    if (!apiKey) {
      console.warn('OPENAI_API_KEY not provided, disabling openAIService...');
      this.active = false;
      return;
    }

    this.active = true;
  }

  async classify(content: string, categories: Category[]) {
    if (!this.active) {
      return undefined;
    }

    const categoryByName = _.keyBy(categories, (c) => c.name);

    const SystemPrompt = TicketClassifyPrompt(categories);

    const UserPrompt = `内容："""\n${content}\n"""`;

    const res = await (async () => {
      try {
        const res = (
          await this.instance.createChatCompletion({
            model: 'gpt-3.5-turbo',
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
          })
        ).data.choices[0].message?.content;

        if (res) {
          return JSON.parse(res) as TicketClassifyResult[];
        }
      } catch (err) {
        console.error(err);
      }
    })();

    if (res) {
      return categoryByName[res[0].category];
    }
  }
}

export const openAIService = new OpenAIService();
