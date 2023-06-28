import { Fragment, ReactNode, createContext, useContext, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Transition } from '@headlessui/react';
import { XIcon } from '@heroicons/react/solid';

import { Button } from '@/components/Button';
import { SpaceChinese } from '@/components/SpaceChinese';

export interface AlertProps {
  title: string;
  content: string;
  buttonTitle?: string;
  show?: boolean;
  onClose: () => void;
}

export function Alert({ title, content, buttonTitle, show, onClose }: AlertProps) {
  const { t } = useTranslation();

  return (
    <Transition show={show} as={Fragment}>
      <Dialog
        className="fixed inset-0 z-50 overflow-y-auto flex justify-center items-center"
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
          className="bg-white rounded-lg w-80 p-4 shadow-lg relative"
          enter="duration-100 ease-out"
          enterFrom="scale-90 opacity-0"
          enterTo="scale-100 opacity-100"
          leave="duration-75 ease-out"
          leaveFrom="scale-100 opacity-100"
          leaveTo="scale-90 opacity-0"
        >
          <button className="absolute top-0 right-0 p-1" onClick={onClose}>
            <XIcon className="w-6 h-6 text-gray-300" />
          </button>

          <Dialog.Title className="font-bold text-lg">{title}</Dialog.Title>
          <Dialog.Description className="mt-4 mb-8 text-gray-400">{content}</Dialog.Description>

          <Button className="w-full" onClick={onClose}>
            <SpaceChinese>{buttonTitle || t('general.confirm')}</SpaceChinese>
          </Button>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
}

interface AlertOptions {
  title: string;
  content: string;
  buttonTitle?: string;
}

const AlertContext = createContext<((options: AlertOptions) => void) | undefined>(undefined);

interface AlertProviderProps {
  children?: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alertProps, setAlertProps] = useState<AlertProps>({
    show: false,
    title: '',
    content: '',
    onClose: () => setAlertProps((prev) => ({ ...prev, show: false })),
  });

  const alert = useRef<(options: AlertOptions) => void>();
  if (!alert.current) {
    alert.current = (options) => {
      setAlertProps((prev) => ({
        ...prev,
        ...options,
        show: true,
      }));
    };
  }

  return (
    <AlertContext.Provider value={alert.current}>
      {children}
      <Alert {...alertProps} />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const alert = useContext(AlertContext);
  if (!alert) {
    throw new Error('useAlert: alert is undefined');
  }
  return alert;
}
