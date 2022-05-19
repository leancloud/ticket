import crypto from 'crypto';
import { File } from '@/model/File';

const SIGNATURE_TTL = 3600;

const { EXTERNAL_QINIU_AK, EXTERNAL_QINIU_SK, EXTERNAL_FILE_SIGN_ENABLED } = process.env;

let signExternalFileEnabled = !!EXTERNAL_FILE_SIGN_ENABLED;
if (signExternalFileEnabled) {
  if (!EXTERNAL_QINIU_AK || !EXTERNAL_QINIU_SK) {
    console.error(
      'EXTERNAL_FILE_SIGN_ENABLED but no EXTERNAL_QINIU_AK or EXTERNAL_QINIU_SK provided.'
    );
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'stage') {
      process.exit(1);
    } else {
      console.error(
        'EXTERNAL_FILE_SIGN was desabled at development. Set EXTERNAL_QINIU_AK and EXTERNAL_QINIU_SK to enable it.'
      );
      signExternalFileEnabled = false;
    }
  }
}
const hmacSha1 = (source: string) =>
  crypto.createHmac('sha1', EXTERNAL_QINIU_SK!).update(source).digest('base64');
const sign = (originalURL: string) => {
  const url = new URL(originalURL);
  url.searchParams.set('e', (Math.floor(Date.now() / 1000) + SIGNATURE_TTL).toString());
  const urlWithTS = url.toString();
  const signature = hmacSha1(urlWithTS);
  const urlSafeSign = signature.replace(/\//g, '_').replace(/\+/g, '-');
  var token = `${EXTERNAL_QINIU_AK}:${urlSafeSign}`;
  return `${urlWithTS}&token=${token}`;
};
export class FileResponse {
  constructor(readonly file: File) {}

  toJSON() {
    const { id, name, mime, url, metaData } = this.file;
    return {
      id,
      name,
      mime,
      url: signExternalFileEnabled && metaData?.external ? sign(url) : url,
    };
  }
}
