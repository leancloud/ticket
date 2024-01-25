import { ReactNode, useState } from 'react';
import { Modal, ModalProps } from 'antd';

export interface SimpleModalProps extends ModalProps {
  trigger: ReactNode;
}

export function SimpleModal({ trigger, ...props }: SimpleModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      <Modal destroyOnClose open={open} onCancel={() => setOpen(false)} footer={null} {...props} />
    </>
  );
}
