import { ReactNode } from 'react';
import { useToggle } from 'react-use';

import { Modal, ModalProps } from '@/components/antd';

interface UseModalOptions {
  props?: ModalProps;
  render: () => ReactNode;
}

export function useModal({ props, render }: UseModalOptions) {
  const [open, toggle] = useToggle(false);

  const modal = (
    <Modal visible={open} onOk={toggle} onCancel={toggle} {...props}>
      {open && render()}
    </Modal>
  );

  return { modal, toggle };
}
