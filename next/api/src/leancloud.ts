import AV from 'leanengine';

AV.init({
  appId: process.env.LEANCLOUD_APP_ID!,
  appKey: process.env.LEANCLOUD_APP_KEY!,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
});

AV.setProduction(process.env.NODE_ENV === 'production');
