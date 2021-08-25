export function scrollIntoViewInNeeded(el: HTMLElement, headerId = 'page-header') {
  const header = document.getElementById(headerId);
  if (!header) {
    return;
  }
  const top = el.offsetTop - header.clientHeight;
  if (window.pageYOffset > top) {
    window.scrollTo({ top });
  }
}
