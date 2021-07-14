import AV from 'leancloud-storage';

export const config = {
  gravatarURL: 'https://www.gravatar.com/avatar',
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
