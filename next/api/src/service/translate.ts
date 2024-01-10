import axios from 'axios';

export class TranslateService {
  private fanyiToken = process.env.FANYI_TOKEN;

  async translate(text: string) {
    if (!this.fanyiToken) {
      return;
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

    return res.data as {
      provider: string;
      from: string;
      text: string;
    };
  }
}

export const translateService = new TranslateService();
