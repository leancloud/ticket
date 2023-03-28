import { useMemo, useState } from 'react';
import { RiCustomerServiceLine } from 'react-icons/ri';
import { IoClose } from 'react-icons/io5';
import { useToggle } from 'react-use';
import { Modal, Tooltip } from '@/components/antd';
import { useTapSupportAuthToken } from '@/api/tds-support';
import { LoadingCover } from '@/components/common';
import styles from './index.module.css';

export function Feedback() {
  const [modalOpen, toggleModalOpen] = useToggle(false);

  if (!import.meta.env.VITE_ENABLE_TAP_SUPPORT) {
    return null;
  }

  return (
    <Tooltip title="客服系统技术支持" placement="right">
      <div className="flex w-10 h-10 mb-2">
        <button
          className="m-auto w-10 h-10 rounded transition-colors hover:bg-[rgba(255,255,255,0.16)] hover:text-white"
          
          onClick={toggleModalOpen}
        >
          <RiCustomerServiceLine className="w-5 h-5 text-primary m-auto" />
        </button>
      </div>

      <FeedbackModal open={modalOpen} onHide={toggleModalOpen} />
    </Tooltip>
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
      visible={open}
      onCancel={onHide}
      centered
      bodyStyle={{ padding: 0, position: 'relative', height: 'calc(100vh - 60px)' }}
      title={null}
      footer={null}
      closable={false}
      // disable animation
      transitionName=""
      maskTransitionName=""
    >
      <FeedbackForm />
      <button
        className="absolute top-3 right-[10px] w-[26px] h-[26px] bg-[#FAFAFA] text-[#888888] border border-gray-100 rounded-full shadow-[0_4px_4px_rgba(0,0,0,0.12)]"
        onClick={onHide}
      >
        <IoClose className="w-4 h-4 m-auto stroke-[16px]" />
      </button>
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
          src={`https://leancloud.support.tdspowered.cn/in-app/v1/products/1${hash}`}
          width="100%"
          height="100%"
          onLoad={() => setIframeLoading(false)}
        />
      )}
    </>
  );
}
