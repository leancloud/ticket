import { lazy as _lazy } from 'react';

function reload() {
  const url = new URL(location.href);
  if (url.searchParams.get('reload') === '0') {
    return false;
  }
  url.searchParams.set('reload', '0');
  location.replace(url);
  return true;
}

function Reloading() {
  return <div>A newer version was found, reloading...</div>;
}

export const lazy: typeof _lazy = (factory) => {
  return _lazy(() =>
    factory().catch((err) => {
      if (reload()) {
        return { default: Reloading as any };
      }
      throw err;
    })
  );
};
