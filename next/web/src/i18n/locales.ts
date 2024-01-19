import { omit } from 'lodash-es';

export const LOCALES: Record<string, string> = {
  'zh-cn': '简体中文',
  'zh-tw': '繁体中文（台湾）',
  'zh-hk': '繁体中文（香港）',
  en: '英语',
  ja: '日语',
  ko: '韩语',
  id: '印尼语',
  th: '泰语',
  de: '德语',
  fr: '法语',
  ru: '俄语',
  es: '西班牙语',
  pt: '葡萄牙语',
  tr: '土耳其语',
  vi: '越南语',
  ar: '阿拉伯语',
  ms: '马来语',
  tl: '菲律宾语',
};

export const TicketLanguages: Record<string, string> = {
  zh: '中文',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁体中文',
  ...omit(LOCALES, ['zh-cn', 'zh-hk', 'zh-tw']),
};
