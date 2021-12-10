import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import cx from 'classnames';

import { Button, Input, Radio } from '@/components/antd';

export interface SaveData {
  name: string;
  privilege: 'private' | 'group' | 'public';
}

export interface SaveDialogProps {
  className?: string;
  open?: boolean;
  onClose: () => void;
  data: SaveData;
  onChange: (data: SaveData) => void;
  onSave: () => Promise<any> | any;
  disabled?: boolean;
}

export function SaveDialog({
  className,
  open,
  onClose,
  data,
  onChange,
  onSave,
  disabled,
}: SaveDialogProps) {
  return (
    <Transition
      show={open}
      as={Fragment}
      enter="transition"
      enterFrom="opacity-0 -translate-y-4"
      enterTo="opacity-100"
      leave="transition"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Dialog
        className={cx('w-[300px] bg-white rounded-b shadow-lg overflow-hidden z-10', className)}
        onClose={onClose}
      >
        <div className="p-4">
          <div>
            <label className="block mb-2 text-[#475867] text-sm font-medium">
              将视图保存为
              <span className="relative top-0.5 ml-0.5 text-[#d72d30] text-base font-bold">*</span>
            </label>
            <Input
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
            />
          </div>

          <div className="mt-4">
            <label className="text-[#475867] text-sm font-medium">显示对象</label>
            <div className="mt-2">
              <Radio.Group
                value={data.privilege}
                onChange={(e) => onChange({ ...data, privilege: e.target.value })}
              >
                <div className="flex flex-col gap-1">
                  <Radio value="private">只有我</Radio>
                  <Radio value="group">同组客服</Radio>
                  <Radio value="public">所有客服</Radio>
                </div>
              </Radio.Group>
            </div>
          </div>
        </div>

        <div className="bg-[#f8f9fa] flex flex-row-reverse p-2">
          <Button
            type="primary"
            size="small"
            disabled={disabled || !data.name || !data.privilege}
            onClick={onSave}
          >
            保存
          </Button>
          <Button className="mr-1" size="small" disabled={disabled} onClick={onClose}>
            取消
          </Button>
        </div>
      </Dialog>
    </Transition>
  );
}
