import { FC, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useRootCategory } from '@/states/root-category';
import { http } from '@/leancloud';
import { useTranslation } from 'react-i18next';
import HelpIcon from '@/icons/Help';
import Bell from '@/icons/Bell';
import Feedback from '@/icons/Feedback';

async function fetchUnread(categoryId?: string) {
  const { data } = await http.get<boolean>(`/api/2/unread`, {
    params: {
      product: categoryId,
    },
  });
  return data;
}

function useHasUnreadTickets(categoryId?: string) {
  return useQuery({
    queryKey: ['unread', categoryId],
    queryFn: () => fetchUnread(categoryId),
  });
}

const Modal: FC<{
  open: boolean;
  onClose: (v: boolean) => void;
  feedback: boolean;
  hasUnreadTickets?: boolean;
}> = ({ onClose, open, feedback, hasUnreadTickets }) => {
  const { t } = useTranslation();

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="z-50 fixed inset-0 flex items-end justify-center">
        <Transition.Child
          as={Fragment}
          enter="ease duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Dialog.Overlay className="fixed bg-[rgba(0,0,0,0.3)] inset-0" />
        </Transition.Child>

        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="translate-y-full"
          enterTo="translate-y-0"
          leave="ease-in duration-150"
          leaveFrom="translate-y-0"
          leaveTo="translate-y-full"
        >
          <div className="fixed text-[#222222] flex flex-col bg-white w-[100%] sm:w-[375px] py-2 rounded-t-lg">
            {feedback && (
              <Link className="text-left px-3 py-4 flex focus:outline-none" to="/categories">
                <Feedback className="mr-2" />
                {t('feedback.action')}
              </Link>
            )}
            <Link className="text-left px-3 py-4 flex relative focus:outline-none" to="/tickets">
              <Bell className="mr-2" />
              {hasUnreadTickets && (
                <div className="w-[8px] h-[8px] rounded-full absolute top-[18px] left-[24px] bg-red border border-white" />
              )}
              {t('feedback.record')}
            </Link>
            <button
              className="mt-2 mx-3 py-2 font-bold border border-gray-100 rounded-full"
              onClick={() => onClose(false)}
            >
              {t('general.cancel')}
            </button>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
};

const Help: FC<{ feedback: boolean }> = ({ feedback }) => {
  const rootCategory = useRootCategory();
  const { data: hasUnreadTickets } = useHasUnreadTickets(rootCategory);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <span className="sticky bottom-4 right-0 flex justify-end mt-auto items-end h-0">
        <button
          onClick={() => setIsOpen(true)}
          className="relative mr-6 sm:mr-0 flex items-center justify-center w-[48px] h-[48px] rounded-full bg-tapBlue "
        >
          <HelpIcon />
          {hasUnreadTickets && (
            <div className="w-[10px] h-[10px] rounded-full absolute top-1 right-0 bg-red border border-white" />
          )}
        </button>
      </span>
      <Modal
        open={isOpen}
        onClose={setIsOpen}
        feedback={feedback}
        hasUnreadTickets={hasUnreadTickets}
      />
    </>
  );
};

export default Help;
