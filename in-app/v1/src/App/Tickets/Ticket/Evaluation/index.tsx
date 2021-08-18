import { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';

import { Radio } from 'components/Form';
import { Button } from 'components/Button';
import CheckIcon from 'icons/Check';
import ThumbDownIcon from 'icons/ThumbDown';
import ThumbUpIcon from 'icons/ThumbUp';
import { http } from 'leancloud';
import { Ticket } from 'types';

export function Evaluated() {
  const { t } = useTranslation();
  return (
    <div className="p-6 border-t border-dashed border-gray-300 text-gray-600 flex items-center text-sm">
      <div className="flex w-4 h-4 bg-tapBlue rounded-full mr-2">
        <CheckIcon className="w-1.5 h-1.5 m-auto text-white" />
      </div>
      {t('evaluation.created_text')}
    </div>
  );
}

async function commitEvaluation(ticketId: string, data: Ticket['evaluation']) {
  await http.patch(`/api/1/tickets/${ticketId}`, { evaluation: data });
}

export interface NewEvaluationProps {
  ticketId: string;
}

export function NewEvaluation({ ticketId }: NewEvaluationProps) {
  const { t } = useTranslation();
  const [star, setStar] = useState<0 | 1>();
  const [content, setContent] = useState('');

  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation({
    mutationFn: (data: Ticket['evaluation']) => commitEvaluation(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticketId]);
    },
  });

  const handleCommit = () => {
    mutate({ star: star!, content });
  };

  return (
    <div className="p-6 border-t border-dashed border-gray-300 text-sm">
      <div className="text-gray-600">{t('evaluation.title')}</div>

      <div className="py-6">
        <span>
          <Radio checked={star === 1} onChange={() => setStar(1)}>
            <span className="inline-flex items-center text-[#FF8156]">
              <ThumbUpIcon className="w-[14px] h-[14px] inline-block mr-1" />
              {t('evaluation.useful')}
            </span>
          </Radio>
        </span>
        <span className="ml-14">
          <Radio checked={star === 0} onChange={() => setStar(0)}>
            <span className="inline-flex items-center text-[#3AB1F3]">
              <ThumbDownIcon className="w-[14px] h-[14px] inline-block mr-1" />
              {t('evaluation.useless')}
            </span>
          </Radio>
        </span>
      </div>

      <div className="flex items-center">
        <input
          className="flex-grow leading-[16px] border rounded-full placeholder-[#BFBFBF] px-3 py-[7px]"
          placeholder={t('evaluation.content_hint')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button
          className="ml-2 w-16 text-[13px] leading-[30px]"
          disabled={star === undefined || isLoading}
          onClick={handleCommit}
        >
          {t('general.commit')}
        </Button>
      </div>
    </div>
  );
}
