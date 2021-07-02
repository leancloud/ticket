import { PropsWithChildren } from 'react';
import { Dialog } from '@headlessui/react';
import { useState } from 'react';

function Video({ src, children }: PropsWithChildren<{ src: string }>) {
  const [show, setShow] = useState(false);

  return (
    <>
      {children}
      <Dialog
        className="fixed inset-0 flex justify-center items-center"
        open={show}
        onClose={() => setShow(false)}
      >
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-60" />
        <video className="z-10 max-h-screen" src={src} controls />
      </Dialog>
    </>
  );
}

function Image({ src, children }: PropsWithChildren<{ src: string }>) {
  const [show, setShow] = useState(false);

  return (
    <>
      {children}
      <Dialog
        className="fixed inset-0 flex justify-center items-center"
        open={show}
        onClose={() => setShow(false)}
      >
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-60" />
        <img className="z-10 max-h-screen" src={src} />
      </Dialog>
    </>
  );
}

function Download({ src, children }: PropsWithChildren<{ src: string }>) {
  return (
    <a download href={src}>
      {children}
    </a>
  );
}

export interface PreviewProps {
  mime?: string;
  url?: string;
}

export function Preview({ mime, url, children }: PropsWithChildren<PreviewProps>) {
  if (!url) {
    return children as JSX.Element;
  }
  return <Download src={url}>{children}</Download>;
}
