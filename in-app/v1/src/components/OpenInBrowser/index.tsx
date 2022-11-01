import { FC } from 'react';
import { openInBrowser, useSDKInfo } from '@/components/SDK';

const ORIGIN = import.meta.env.VITE_LC_TICKET_HOST || window.location.origin;

const isExternalLink = (href: string) => {
  let origin = '';
  try {
    origin = new URL(href).origin;
  } catch (error) {
    console.log(error);
  }
  return origin !== ORIGIN;
};

export const Content: FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  const [info] = useSDKInfo();
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName !== 'A') {
      return;
    }

    const $a = e.target as HTMLAnchorElement;
    const { href } = $a;

    if (info.isInit && isExternalLink(href)) {
      e.preventDefault();
      openInBrowser(href);
      return;
    }
  };

  return <div {...props} onClick={handleClick} />;
};

export default {
  Content,
};
