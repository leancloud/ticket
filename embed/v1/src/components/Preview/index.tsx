import { Fragment, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';

export interface PreviewProps {
  show: boolean;
  onClose: () => void;
  type?: 'image' | 'video';
  src?: string;
}

export function Preview({ show, onClose, type, src }: PreviewProps) {
  const $element = useRef<HTMLDivElement>(null);

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="duration-100 ease-out"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="duration-75 ease-out"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Dialog
        className="fixed inset-0 flex justify-center items-center"
        onClose={onClose}
        initialFocus={$element}
      >
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-60" />

        <div className="z-10" ref={$element}>
          {type === 'image' && <img src={src} />}
          {type === 'video' && <video className="max-h-screen" src={src} controls />}
        </div>
      </Dialog>
    </Transition>
  );
}
