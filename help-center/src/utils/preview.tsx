import { Modal } from '@/components/antd';

function getFileType(mime: string): 'image' | 'video' | 'unknown' {
  if (mime.startsWith('image')) {
    return 'image';
  }
  if (mime.startsWith('video')) {
    return 'video';
  }
  return 'unknown';
}

export interface PreviewableFile {
  mime?: string;
  url?: string;
}

export const preview = ({ mime, url }: PreviewableFile) => {
  const baseProps = {
    icon: null,
    footer: null,
    width: '80%',
  };

  if (!mime || !url) {
    return;
  }
  const fileType = getFileType(mime);

  switch (fileType) {
    case 'image':
      Modal.info({
        ...baseProps,
        content: <img className="m-auto w-full" src={url} />,
      });
      break;
    case 'video':
      Modal.info({
        ...baseProps,
        content: <video className="m-auto w-full" src={url} autoPlay controls playsInline />,
      });
      break;
    default:
      window.open(url);
  }
};
