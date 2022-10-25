import { useMemo, useState } from 'react';
import { AiOutlineMessage } from 'react-icons/ai';
import { useToggle } from 'react-use';
import { Modal } from '@/components/antd';
import { useTapSupportAuthToken } from '@/api/tds-support';
import { LoadingCover } from '@/components/common';
import styles from './index.module.css';

export function Feedback() {
  const [modalOpen, toggleModalOpen] = useToggle(false);

  return (
    <>
      <div className="w-full h-full flex">
        <button
          className="m-auto w-10 h-10 rounded transition-colors hover:bg-[rgba(255,255,255,0.16)] hover:text-white"
          title="反馈"
          onClick={toggleModalOpen}
        >
          <AiOutlineMessage className="w-6 h-6 text-primary m-auto" />
        </button>
      </div>

      <FeedbackModal open={modalOpen} onHide={toggleModalOpen} />
    </>
  );
}

interface FeedbackModalProps {
  open: boolean;
  onHide: () => void;
}

function FeedbackModal({ open, onHide }: FeedbackModalProps) {
  return (
    <Modal
      className={styles.feedbackModal}
      title="反馈"
      visible={open}
      onCancel={onHide}
      bodyStyle={{ padding: 0, position: 'relative', height: 'calc(100vh - 255px)' }}
      footer={null}
      // disable animation
      transitionName=""
      maskTransitionName=""
    >
      <FeedbackForm />
    </Modal>
  );
}

function FeedbackForm() {
  const { data: token, isFetching } = useTapSupportAuthToken();
  const [iframeLoading, setIframeLoading] = useState(true);

  const hash = useMemo(() => {
    if (token) {
      return `#credential=${token}`;
    }
    return '';
  }, [token]);

  return (
    <>
      {(isFetching || iframeLoading) && <LoadingCover />}
      {!isFetching && token && (
        <iframe
          className={iframeLoading ? 'invisible' : undefined}
          src={`https://leancloud.support.tdspowered.cn/in-app/v1/${hash}`}
          width="100%"
          height="100%"
          onLoad={() => setIframeLoading(false)}
        />
      )}
    </>
  );
}
