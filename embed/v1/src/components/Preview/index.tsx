import { useRef } from 'react';
import { Dialog } from '@headlessui/react';

export interface PreviewProps {
  show: boolean;
  onClose: () => void;
  type: 'image' | 'video';
  src: string;
}

export function Preview({ show, onClose, type, src }: PreviewProps) {
  const $container = useRef<HTMLDivElement>(null);

  return (
    <Dialog
      className="fixed inset-0 flex justify-center items-center"
      open={show}
      onClose={onClose}
      initialFocus={$container}
    >
      <Dialog.Overlay className="fixed inset-0 bg-black opacity-60" />
      <div className="z-10 " ref={$container}>
        {type === 'image' && <img src={src} />}
        {type === 'video' && <video className="max-h-screen" src={src} controls />}
      </div>
    </Dialog>
  );
}
