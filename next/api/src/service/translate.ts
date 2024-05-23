import axios from 'axios';

export class TranslateService {
  private fanyiURL = process.env.FANYI_URL || 'https://fanyi.leanapp.cn/';

  private fanyiToken = process.env.FANYI_TOKEN;

  async translate(text: string) {
    if (!this.fanyiToken) {
      return;
    }

    const res = await axios.post(
      this.fanyiURL,
      { text },
      {
        timeout: 2000,
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
