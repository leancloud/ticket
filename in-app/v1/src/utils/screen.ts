export const checkIsLandScreen = () => {
  const orientation = window.screen.orientation?.type;
  if (orientation) {
    return orientation === 'landscape-primary';
  }

  return window.innerHeight === window.innerWidth
    ? document.documentElement.clientHeight < document.documentElement.clientWidth
    : window.innerHeight <= window.innerWidth;
};
