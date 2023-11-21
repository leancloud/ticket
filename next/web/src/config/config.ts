import { ReactNode } from 'react';

import { UserSchema } from '@/api/user';

export type MetadataRenderer = (
  value: any,
  key: string
) => { label: ReactNode; content: ReactNode };

export interface WebConfig {
  'ticketDetail.userLabelOverlay': (user: UserSchema) => ReactNode;
  'ticketDetail.metadataRenderers': Record<string, MetadataRenderer>;
}

const config: Partial<WebConfig> = {};

export function setConfig<K extends keyof WebConfig>(key: K, value: WebConfig[K] | undefined) {
  config[key] = value;
}

export function getConfig<K extends keyof WebConfig>(key: K): WebConfig[K] | undefined {
  return config[key];
}

export function setMetadataRenderer(key: string, renderer: MetadataRenderer) {
  config['ticketDetail.metadataRenderers'] = {
    ...config['ticketDetail.metadataRenderers'],
    [key]: renderer,
  };
}

export function getMetadataRenderer(key: string): MetadataRenderer | undefined {
  return config['ticketDetail.metadataRenderers']?.[key];
}
