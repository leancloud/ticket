import { Modal } from 'antd';
import { FC, useEffect, useState } from 'react';
import { LocaleSelect } from './LocaleSelect';

export interface LocaleModalProps {
  show: boolean;
  hiddenLocales?: string[];
  onOk?: (locale: string) => void;
  onCancel?: () => void;
}

export const LocaleModal: FC<LocaleModalProps> = ({ show, hiddenLocales, onOk, onCancel }) => {
  const [value, setValue] = useState<string>();
  useEffect(() => {
    setValue(undefined);
  }, [show]);

  return (
    <Modal
      title="请选择要添加的语言"
      open={show}
      okButtonProps={{ disabled: !value }}
      onOk={() => onOk?.(value!)}
      onCancel={onCancel}
    >
      <LocaleSelect
        className="w-full"
        value={value}
        onChange={setValue}
        hiddenLocales={hiddenLocales}
      />
    </Modal>
  );
};
