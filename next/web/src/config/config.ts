import { ReactNode } from 'react';

export type MetadataRenderer = (
  value: any,
  key: string
) => { label: ReactNode; content: ReactNode };

const metadataRenderers: Record<string, MetadataRenderer> = {};

export function setMetadataRenderer(key: string, renderer: MetadataRenderer) {
  metadataRenderers[key] = renderer;
}

export function getMetadataRenderer(key: string): MetadataRenderer | undefined {
  return metadataRenderers[key];
}
