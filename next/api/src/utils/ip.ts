import axios from 'axios';

const { IP_LOOKUP_ENABLED, IP_LOOKUP_SERVER } = process.env;

export async function lookupIp(
  ip: string
): Promise<{ region?: string; city?: string; isp?: string }> {
  if (!IP_LOOKUP_ENABLED) throw new Error('IP lookup is disabled.');
  if (!IP_LOOKUP_SERVER) throw new Error('IP lookup server is not configured.');

  try {
    const server = IP_LOOKUP_SERVER.replace(':ip', ip);
    return (await axios.get(server)).data;
  } catch (error) {
    console.warn('Failed to lookup IP:', ip, error instanceof Error ? error.message : error, error);
    return { region: undefined, city: undefined, isp: undefined };
  }
}
