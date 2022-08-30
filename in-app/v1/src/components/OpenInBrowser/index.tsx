import { FC } from 'react';
import { openInBrowser } from '@/utils/sdk';

const ORIGIN = window.location.origin;

const isExternalLink = (link: string) => {
  let origin = '';
  try {
    origin = new URL(link).origin;
  } catch (error) {
    console.log(error);
  }
  return origin === ORIGIN;
};

export const Content: FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName !== 'A') {
      return;
    }

    const $a = e.target as HTMLAnchorElement;
    const { target, href } = $a;

    if (isExternalLink(href)) {
      e.preventDefault();
      openInBrowser(href).catch(() => {
        window.open(href, target || '_self');
      });
      return;
    }
  };

  return <div {...props} onClick={handleClick} />;
};

export default {
  Content,
};
