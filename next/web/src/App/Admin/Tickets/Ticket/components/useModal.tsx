import { ReactNode } from 'react';
import { useToggle } from 'react-use';
import { Modal, ModalProps } from 'antd';

interface UseModalOptions {
  props?: ModalProps;
  render: () => ReactNode;
}

export function useModal({ props, render }: UseModalOptions) {
  const [open, toggle] = useToggle(false);

  const modal = (
    <Modal open={open} onOk={toggle} onCancel={toggle} {...props}>
      {open && render()}
    </Modal>
  );

  return Object.assign([modal, toggle] as const, { modal, toggle });
}
