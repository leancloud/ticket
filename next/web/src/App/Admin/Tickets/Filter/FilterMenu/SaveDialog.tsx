import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import cx from 'classnames';

import Form from 'components/Form';
import Button from 'components/Button';

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
        className={cx('w-[300px] bg-white rounded-b shadow-lg overflow-hidden', className)}
        onClose={onClose}
      >
        <div className="p-4">
          <div>
            <Form.Label required>将视图保存为</Form.Label>
            <Form.Input
              className="w-full mt-2"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <Form.Label>显示对象</Form.Label>
            <div>
              <Form.Label className="flex items-center mt-2">
                <Form.Radio
                  checked={data.privilege === 'private'}
                  onChange={() => onChange({ ...data, privilege: 'private' })}
                />
                <span className="ml-1.5">只有我</span>
              </Form.Label>

              <Form.Label className="flex items-center mt-2">
                <Form.Radio
                  checked={data.privilege === 'group'}
                  onChange={() => onChange({ ...data, privilege: 'group' })}
                />
                <span className="ml-1.5">同组客服</span>
              </Form.Label>

              <Form.Label className="flex items-center mt-2">
                <Form.Radio
                  checked={data.privilege === 'public'}
                  onChange={() => onChange({ ...data, privilege: 'public' })}
                />
                <span className="ml-1.5">所有客服</span>
              </Form.Label>
            </div>
          </div>
        </div>

        <div className="bg-[#f8f9fa] flex flex-row-reverse p-2">
          <Button
            variant="primary"
            disabled={disabled || !data.name || !data.privilege}
            onClick={onSave}
          >
            保存
          </Button>
          <Button className="mr-1" disabled={disabled} onClick={onClose}>
            取消
          </Button>
        </div>
      </Dialog>
    </Transition>
  );
}
