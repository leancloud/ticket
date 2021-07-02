import { useCallback, useMemo, useState } from 'react';

import { File } from 'types';
import { Preview, PreviewProps } from 'components/Preview';

function getFileType(mime: string): PreviewProps['type'] | 'unknown' {
  if (mime.startsWith('image')) {
    return 'image';
  }
  return 'unknown';
}

export function usePreview() {
  const [show, setShow] = useState(false);
  const [type, setType] = useState<PreviewProps['type']>();
  const [src, setSrc] = useState<string>();

  const element = useMemo(() => {
    if (show && type && src) {
      return <Preview show onClose={() => setShow(false)} type={type} src={src} />;
    }
    return null;
  }, [show, type, src]);

  const preview = useCallback((file: File) => {
    const fileType = getFileType(file.mime);
    switch (fileType) {
      case 'image':
        setType('image');
        setSrc(file.url);
        setShow(true);
    }
  }, []);

  return { element, preview };
}
