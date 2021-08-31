import { Fragment, PropsWithChildren, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import Button from 'components/Button';
import { Label, Textarea } from 'components/Form';
import { AssigneeSelect } from './AssigneeSelect';
import { GroupSelect } from './GroupSelect';
import { CategorySelect } from './CategorySelect';

function Field({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <div className="mt-4">
      <Label className="block pb-1.5">{title}</Label>
      {children}
    </div>
  );
}

export interface BatchUpdateDialogProps {
  open?: boolean;
  onClose: () => void;
}

export function BatchUpdateDialog({ open, onClose }: BatchUpdateDialogProps) {
  const [replyContent, setReplyContent] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>();
  const [groupId, setGroupId] = useState<string>();
  const [categoryId, setCategoryId] = useState<string>();

  useEffect(() => {
    if (!open) {
      setReplyContent('');
      setAssigneeId(undefined);
      setGroupId(undefined);
      setCategoryId(undefined);
    }
  }, [open]);

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
          <div className="flex flex-col h-full">
            <div className="flex-grow px-8 py-4 overflow-x-auto">
              <Field title="批量回复">
                <Textarea
                  className="w-full"
                  rows={5}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
              </Field>

              <Field title="客服">
                <AssigneeSelect open={open} value={assigneeId} onChange={setAssigneeId} />
              </Field>

              <Field title="客服组">
                <GroupSelect open={open} value={groupId} onChange={setGroupId} />
              </Field>

              <Field title="分类">
                <CategorySelect open={open} value={categoryId} onChange={setCategoryId} />
              </Field>
            </div>
            <div className="flex flex-row-reverse flex-shrink-0 px-6 py-3 bg-[#f8f9fa] border-t border-[#cfd7df]">
              <Button variant="primary" className="min-w-[80px]">
                保存
              </Button>
              <Button className="mr-2 min-w-[80px]" onClick={onClose}>
                取消
              </Button>
            </div>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
}
