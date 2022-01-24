import { useCallback, useState } from 'react';

import { Preview, PreviewProps } from '@/components/Preview';

function getFileType(mime: string): PreviewProps['type'] | 'unknown' {
  if (mime.startsWith('image')) {
    return 'image';
  }
  if (mime.startsWith('video')) {
    return 'video';
  }
  return 'unknown';
}

export interface PreviewableFile {
  mime: string;
  url: string;
}

export function usePreview() {
  const [props, setProps] = useState<Omit<PreviewProps, 'onClose'>>({ show: false });
  const handleClose = useCallback(() => setProps((prev) => ({ ...prev, show: false })), []);

  const element = <Preview {...props} onClose={handleClose} />;

  const preview = useCallback((file: PreviewableFile) => {
    const fileType = getFileType(file.mime);
    switch (fileType) {
      case 'image':
        setProps({ show: true, type: 'image', src: file.url });
        break;
      case 'video':
        setProps({ show: true, type: 'video', src: file.url });
        break;
      default:
        window.open(file.url);
    }
  }, []);

  return { element, preview };
}
