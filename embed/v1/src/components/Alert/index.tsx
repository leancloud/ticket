import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XIcon } from '@heroicons/react/solid';

import { Button } from 'components/Button';

export interface AlertProps {
  title: string;
  content: string;
  buttonTitle?: string;
  show?: boolean;
  onClose: () => void;
}

export function Alert({ title, content, buttonTitle, show, onClose }: AlertProps) {
  return (
    <Transition show={show} as={Fragment}>
      <Dialog
        className="fixed inset-0 overflow-y-auto flex justify-center items-center"
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enterFrom="opacity-0"
          enterTo="opacity-30"
          entered="opacity-30"
          leaveFrom="opacity-30"
          leaveTo="opacity-0"
        >
          <Dialog.Overlay className="fixed inset-0 bg-black" />
        </Transition.Child>
        <Transition.Child
          className="bg-white rounded-lg w-80 z-10 p-4 shadow-lg relative"
          enter="duration-100 ease-out"
          enterFrom="transform scale-90 opacity-0"
          enterTo="transform scale-100 opacity-100"
          leave="duration-75 ease-out"
          leaveFrom="transform scale-100 opacity-100"
          leaveTo="transform scale-90 opacity-0"
        >
          <button className="absolute top-0 right-0 p-1" onClick={onClose}>
            <XIcon className="w-6 h-6 text-gray-300" />
          </button>

          <Dialog.Title className="font-bold text-lg">{title}</Dialog.Title>
          <Dialog.Description className="mt-4 mb-8 text-gray-400">{content}</Dialog.Description>

          <Button className="w-full" onClick={onClose}>
            {buttonTitle || '确 定'}
          </Button>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
}
