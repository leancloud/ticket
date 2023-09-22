import Router from '@koa/router';
import { HttpError } from 'koa';
import { URL, URLSearchParams } from 'url';

const HOST = process.env.TICKET_HOST;
if (!HOST) {
  throw new Error('TICKET_HOST is not configed');
}

function convertLanguageTag(tag: string): string {
  const nonStandardTags: { [key: string]: string } = {
    cn: 'zh-CN',
    tw: 'zh-TW',
    kr: 'ko-KR',
    jp: 'ja-JP',
    id: 'id-ID',
  };

  const normalizedTag = tag.replace('_', '-');

  return nonStandardTags[normalizedTag] || normalizedTag;
}

const pickFirst = (query: string | string[]) => (Array.isArray(query) ? query[0] : query);

const router = new Router();

router.get('/in-app', async (ctx) => {
  const { client_id, user_id, access_token, xd_access_token, sdk_lang, ...rest } = ctx.query;
  if (!client_id) {
    throw new HttpError('client_id is required.');
  }
  const lang = sdk_lang ? convertLanguageTag(pickFirst(sdk_lang)) : undefined;
  const url = new URL(`${HOST}/in-app/v1/products/${encodeURIComponent(pickFirst(client_id))}`);
  if (lang) {
    url.searchParams.append('lang', lang);
  }
  const hash = new URLSearchParams();
  if (xd_access_token) hash.append('xd-access-token', pickFirst(xd_access_token));
  if (access_token) hash.append('access-token', pickFirst(access_token));
  if (user_id) hash.append('xd-user-id', pickFirst(user_id));
  hash.append('fields', JSON.stringify({ ...rest, sdk_lang: lang }));
  url.hash = hash.toString();

  ctx.redirect(url.toString());
});

export default router;
