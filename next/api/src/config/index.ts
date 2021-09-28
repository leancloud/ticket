import { Config } from '../model/Config';

export const config = {
  allowModifyEvaluation: boolean(process.env.ALLOW_MUTATE_EVALUATION),
  enableLeanCloudIntegration: boolean(process.env.ENABLE_LEANCLOUD_INTEGRATION),
  gravatarURL: 'https://www.gravatar.com/avatar',
  host: getHost(),
  sla: 120,
};

function boolean(value: any): boolean {
  switch (typeof value) {
    case 'boolean':
      return value;
    case 'number':
    case 'bigint':
      return value !== 0;
    case 'object':
      return true;
    case 'string':
      if (value === '0' || value.toLowerCase() === 'false') {
        return false;
      }
      return true;
    default:
      return false;
  }
}

function getHost() {
  switch (process.env.LEANCLOUD_APP_ENV) {
    case 'production':
      return process.env.TICKET_HOST;
    case 'stage':
      return process.env.TICKET_HOST_STG;
    default:
      return 'http://localhost:' + process.env.LEANCLOUD_APP_PORT;
  }
}

Config.get('gravatar_url').then((value) => {
  if (value) config.gravatarURL = value;
});

Config.get('SLA_in_mimutes').then((sla) => {
  if (sla) config.sla = sla;
});

if (config.enableLeanCloudIntegration) {
  console.log('[LeanCloud] Integration enabled');
}
