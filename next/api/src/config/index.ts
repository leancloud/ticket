import { Config } from '../model/Config';

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
  sla: 120,
};

Config.get('gravatar_url').then((value) => {
  if (value) {
    config.gravatarURL = value;
  }
});

Config.get('SLA_in_mimutes').then((sla) => {
  if (sla) {
    config.sla = sla;
  }
});
