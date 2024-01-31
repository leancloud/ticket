import AV from 'leanengine';

AV.init({
  appId: process.env.LEANCLOUD_APP_ID!,
  appKey: process.env.LEANCLOUD_APP_KEY!,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
});

AV.setProduction(process.env.NODE_ENV === 'production');

export const regions = [
  {
    region: 'cn-n1',
    regionText: '华北',
    serverDomain: 'https://cn-n1-console-api.leancloud.cn',
    oauthPlatform: 'leancloud',
  },
  {
    region: 'us-w1',
    regionText: '国际',
    serverDomain: 'https://us-w1-console-api.leancloud.app',
    oauthPlatform: 'leancloud_us_w1',
  },
];
