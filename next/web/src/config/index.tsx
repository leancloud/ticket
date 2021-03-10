export {};

import { setMetadataRenderer } from './config';

setMetadataRenderer('game', (id: number) => {
  return {
    label: '游戏 ID',
    content: <a href={`https://www.taptap.com/app/${id}`}>{id}</a>,
  };
});

setMetadataRenderer('game_name', (name: string) => {
  return {
    label: '游戏名称',
    content: name,
  };
});

setMetadataRenderer('developerId', (id: number) => {
  return {
    label: '厂商 ID',
    content: <a href={`https://www.taptap.com/developer/${id}`}>{id}</a>,
  };
});

setMetadataRenderer('developer_name', (name: string) => {
  return {
    label: '厂商名称',
    content: name,
  };
});
