import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, ThumbDownIcon, ThumbUpIcon } from '@heroicons/react/solid';

import { Input, Radio } from 'components/Form';
import { Button } from 'components/Button';
import { useMutation } from 'react-query';
import { http } from 'leancloud';
import { Ticket } from 'types';

export function Evaluated() {
  const { t } = useTranslation();
  return (
    <div className="p-6 border-t border-dashed border-gray-300 text-gray-600 flex items-center">
      <CheckCircleIcon className="w-6 h-6 mr-3 text-tapBlue-600" />{' '}
      {t('ticket.evaluate.success_text')}
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

  const { mutate, isLoading } = useMutation({
    mutationFn: (data: Ticket['evaluation']) => commitEvaluation(ticketId, data),
  });

  const handleCommit = () => {
    mutate({ star: star!, content });
  };

  return (
    <div className="p-6 border-t border-dashed border-gray-300">
      <div className="text-gray-600">{t('ticket.evaluation')}</div>

      <div className="py-6">
        <span>
          <Radio checked={star === 1} onChange={() => setStar(1)}>
            <span className="text-yellow-500 inline-flex items-center">
              <ThumbUpIcon className="w-4 h-4 inline-block mr-1" />
              {t('ticket.evaluate.useful')}
            </span>
          </Radio>
        </span>
        <span className="ml-16">
          <Radio checked={star === 0} onChange={() => setStar(0)}>
            <span className="text-blue-500 inline-flex items-center">
              <ThumbDownIcon className="w-4 h-4 inline-block mr-1" />
              {t('ticket.evaluate.useless')}
            </span>
          </Radio>
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          className="flex-grow rounded-full"
          placeholder={t('ticket.evaluate.content_hint')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button
          className="px-5 flex-shrink-0"
          disabled={star === undefined || isLoading}
          onClick={handleCommit}
        >
          {t('general.commit')}
        </Button>
      </div>
    </div>
  );
}
