import { Dialog } from '@headlessui/react';
import { useCallback } from 'react';
import { useMemo } from 'react';
import { useState } from 'react';
import { useRef } from 'react';

export interface PreviewProps {
  show: boolean;
  onClose: () => void;
  type: 'image' | 'video';
  src: string;
}

export function Preview({ show, onClose, src, type }: PreviewProps) {
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

export interface UsePreviewResult {
  preview: (options: { type: PreviewProps['type']; src: PreviewProps['src'] }) => void;
}

export interface UsePreviewOptions {
  type: PreviewProps['type'];
  src: string;
}

export function usePreview({ type, src }: UsePreviewOptions) {
  const [show, setShow] = useState(false);

  const element = useMemo(() => {
    if (show && type && src) {
      return <Preview show onClose={() => setShow(false)} type={type} src={src} />;
    }
    return null;
  }, [show, type, src]);

  const toggle = useCallback(() => setShow((v) => !v), []);

  return { element, toggle };
}
