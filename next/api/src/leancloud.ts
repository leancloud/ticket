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
    region: 'cn-e1',
    regionText: '华东',
    serverDomain: 'https://cn-e1-console-api.leancloud.cn',
    oauthPlatform: 'leancloud_cn_e1',
  },
  {
    region: 'us-w1',
    regionText: '北美',
    serverDomain: 'https://us-w1-console-api.leancloud.app',
    oauthPlatform: 'leancloud_us_w1',
  },
];
