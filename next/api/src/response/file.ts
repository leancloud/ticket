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
  const hasParams = url.search.length > 0;
  const expiredAt = (Math.floor(Date.now() / 1000) + SIGNATURE_TTL).toString();
  const urlWithTS = `${url}${hasParams ? '&' : '?'}e=${expiredAt}`;
  const signature = hmacSha1(urlWithTS);
  const urlSafeSign = signature.replace(/\//g, '_').replace(/\+/g, '-');
  const token = `${EXTERNAL_QINIU_AK}:${urlSafeSign}`;
  return `${urlWithTS}&token=${token}`;
};

const getImageThumbnailURL = (originalURL: string) =>
  `${originalURL}?imageView2/0/w/1080/h/9999/interlace/1/ignore-error/1`;
const getVideoThumbnailURL = (originalURL: string) => `${originalURL}?vframe/jpg/offset/1`;

const getThumbnailURL = (file: File) => {
  const { mime, url } = file;
  if (mime?.startsWith('image/')) {
    return getImageThumbnailURL(url);
  }
  if (mime?.startsWith('video/')) {
    return getVideoThumbnailURL(url);
  }
  return url;
};

export class FileResponse {
  constructor(readonly file: File) {}

  toJSON() {
    const { id, name, mime, url, metaData } = this.file;
    const needSignature = signExternalFileEnabled && metaData?.external;
    const thumbnailURL = getThumbnailURL(this.file);
    return {
      id,
      name,
      mime,
      metaData,
      url: needSignature ? sign(url) : url,
      thumbnailUrl: needSignature ? sign(thumbnailURL) : thumbnailURL,
    };
  }
}
