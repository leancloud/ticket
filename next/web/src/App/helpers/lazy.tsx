import { lazy as _lazy } from 'react';

function shouldReload() {
  const reloadedAt = sessionStorage.getItem('TapDesk/reloadedAt');
  if (reloadedAt && Date.now() - parseInt(reloadedAt) < 10000) {
    return false;
  }
  sessionStorage.setItem('TapDesk/reloadedAt', Date.now().toString());
  return true;
}

function Reloading() {
  return <div>A newer version was found, reloading...</div>;
}

export const lazy: typeof _lazy = (factory) => {
  return _lazy(() =>
    factory().catch((err) => {
      if (shouldReload()) {
        location.reload();
        return { default: Reloading as any };
      }
      throw err;
    })
  );
};
