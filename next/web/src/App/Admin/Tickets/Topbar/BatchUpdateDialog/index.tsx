import { Fragment, PropsWithChildren, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import cx from 'classnames';

import { Button, Input } from '@/components/antd';
import { BatchUpdateData } from '../batchUpdate';
import { AssigneeSelect } from './AssigneeSelect';
import { GroupSelect } from './GroupSelect';
import { CategorySelect } from './CategorySelect';

function Field({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <div className="mt-4">
      <label className="block pb-1.5 text-[#475867] text-sm font-medium">{title}</label>
      {children}
    </div>
  );
}

interface BatchUpdateFormProps {
  className?: string;
  onCancel: () => void;
  onSubmit: (data: BatchUpdateData) => Promise<any> | any;
}

function BatchUpdateForm({ className, onCancel, onSubmit }: BatchUpdateFormProps) {
  const [replyContent, setReplyContent] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>();
  const [groupId, setGroupId] = useState<string>();
  const [categoryId, setCategoryId] = useState<string>();

  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const data: BatchUpdateData = {};
      if (replyContent) {
        const trimed = replyContent.trim();
        if (trimed) {
          data.reply = { content: trimed };
        }
      }
      if (assigneeId) {
        data.assigneeId = assigneeId;
      }
      if (groupId) {
        data.groupId = groupId;
      }
      if (categoryId) {
        data.caregoryId = categoryId;
      }
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="batchUpdateForm" className={cx('flex flex-col', className)}>
      <div className="grow px-8 py-4 overflow-x-auto">
        <Field title="批量回复">
          <Input.TextArea
            rows={5}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
        </Field>

        <Field title="客服">
          <AssigneeSelect value={assigneeId} onChange={setAssigneeId} />
        </Field>

        <Field title="客服组">
          <GroupSelect value={groupId} onChange={setGroupId} />
        </Field>

        <Field title="分类">
          <CategorySelect value={categoryId} onChange={setCategoryId} />
        </Field>

        <p className="mt-4 text-sm text-gray-400">留空的条目将保持不变</p>
      </div>
      <div className="flex flex-row-reverse shrink-0 px-6 py-3 bg-[#f8f9fa] border-t border-[#cfd7df]">
        <Button type="primary" className="min-w-[80px]" disabled={isLoading} onClick={handleSubmit}>
          保存
        </Button>
        <Button className="mr-2 min-w-[80px]" disabled={isLoading} onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
}

export interface BatchUpdateDialogProps {
  open?: boolean;
  onClose: () => void;
  onSubmit: BatchUpdateFormProps['onSubmit'];
}

export function BatchUpdateDialog({ open, onClose, onSubmit }: BatchUpdateDialogProps) {
  return (
    <Transition as={Fragment} show={open}>
      <Dialog onClose={onClose}>
        <Transition.Child as={Fragment} enter="transition duration-300" enterFrom="opacity-0">
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(24,50,71,.6)]" />
        </Transition.Child>

        <Transition.Child
          className="fixed inset-y-0 right-0 w-[600px] z-50 bg-white"
          enter="transition duration-300"
          enterFrom="translate-x-[100%]"
        >
          <BatchUpdateForm className="h-full" onCancel={onClose} onSubmit={onSubmit} />
        </Transition.Child>
      </Dialog>
    </Transition>
  );
}
