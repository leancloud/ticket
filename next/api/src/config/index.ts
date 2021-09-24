import AV from 'leancloud-storage';

const host = (() => {
  switch (process.env.LEANCLOUD_APP_ENV) {
    case 'production':
      return process.env.TICKET_HOST;
    case 'stage':
      return process.env.TICKET_HOST_STG;
    default:
      return 'http://localhost:' + process.env.LEANCLOUD_APP_PORT;
  }
})();

export const config = {
  host,
  gravatarURL: 'https://www.gravatar.com/avatar',
  enableLeanCloudIntegration: !!process.env.ENABLE_LEANCLOUD_INTEGRATION,
};

export async function getConfig(key: string): Promise<any> {
  const query = new AV.Query('Config');
  query.select('value').equalTo('key', key);
  const object = await query.first({ useMasterKey: true });
  if (!object) {
    return null;
  }
  return object.get('value');
}

getConfig('gravatar_url').then((value) => {
  if (value) config.gravatarURL = value;
});
