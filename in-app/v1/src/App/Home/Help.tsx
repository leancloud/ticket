import { FC, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { http } from '@/leancloud';
import { useRootCategory } from '@/App';
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
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-end justify-center">
        <Dialog.Panel className="text-[#222222] flex flex-col bg-white w-[100%] sm:w-[375px] py-2 rounded-t-lg">
          {feedback && (
            <Link className="text-left px-3 py-4 flex" to="/topCategories">
              <Feedback className="mr-2" />
              {t('feedback.action')}
            </Link>
          )}
          <Link className="text-left px-3 py-4 flex relative" to="/tickets">
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
        </Dialog.Panel>
      </div>
    </Dialog>
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
          className="relative flex items-center justify-center w-[48px] h-[48px] rounded-full bg-tapBlue "
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
