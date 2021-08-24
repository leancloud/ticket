import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import styles from './index.module.css';

export interface PreviewProps {
  show: boolean;
  onClose: () => void;
  type?: 'image' | 'video';
  src?: string;
}

export function Preview({ show, onClose, type, src }: PreviewProps) {
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
      <Dialog className="fixed inset-0 z-50 flex justify-center items-center" onClose={onClose}>
        <Dialog.Overlay className="fixed inset-0" />

        <div
          tabIndex={0}
          className={`${styles.content} flex z-10 outline-none bg-black rounded w-[85%] sm:w-[60%] h-[60%] sm:h-[85%] overflow-hidden shadow-md`}
        >
          {type === 'image' && <img className="m-auto max-h-full" src={src} />}
          {type === 'video' && (
            <video className="m-auto max-h-full" src={src} autoPlay controls playsInline />
          )}
        </div>
      </Dialog>
    </Transition>
  );
}
