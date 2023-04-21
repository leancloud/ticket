import { omit } from 'lodash-es';

export const LOCALES: Record<string, string> = {
  'zh-cn': '简体中文',
  'zh-tw': '繁体中文（台湾）',
  'zh-hk': '繁体中文（香港）',
  en: '英文',
  ja: '日文',
  ko: '韩文',
  id: '印尼文',
  th: '泰文',
  de: '德文',
  fr: '法文',
  ru: '俄文',
  es: '西班牙文',
  pt: '葡萄牙文',
  tr: '土耳其文',
  vi: '越南文',
};

export const TicketLanguages: Record<string, string> = {
  ...omit(LOCALES, ['zh-cn', 'zh-hk', 'zh-tw']),
  zh: '中文',
};
