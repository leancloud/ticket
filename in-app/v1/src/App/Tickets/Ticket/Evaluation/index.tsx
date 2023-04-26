import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Radio } from '@/components/Form';
import { Button } from '@/components/Button';
import CheckIcon from '@/icons/Check';
import ThumbDownIcon from '@/icons/ThumbDown';
import ThumbUpIcon from '@/icons/ThumbUp';

interface EvaluatedProps {
  onClickChangeButton: () => void;
}

export function Evaluated({ onClickChangeButton }: EvaluatedProps) {
  const { t } = useTranslation();
  const allowMutateEval = import.meta.env.VITE_ALLOW_MUTATE_EVALUATION;

  return (
    <div className="p-6 border-t border-dashed border-gray-300 text-gray-600 flex items-center text-sm">
      <div className="flex w-4 h-4 bg-tapBlue rounded-full mr-2">
        <CheckIcon className="w-1.5 h-1.5 m-auto text-white" />
      </div>
      {t('evaluation.created_text')}
      {allowMutateEval && (
        <button className="text-tapBlue" onClick={onClickChangeButton}>
          ({t('evaluation.change')})
        </button>
      )}
    </div>
  );
}

interface EvaluationData {
  star: 0 | 1;
  content: string;
}

export interface NewEvaluationProps {
  initData?: EvaluationData | null;
  loading?: boolean;
  onSubmit: (data: EvaluationData) => void;
}

export function NewEvaluation({ initData, loading, onSubmit }: NewEvaluationProps) {
  const { t } = useTranslation();
  const [star, setStar] = useState<0 | 1>();
  const [content, setContent] = useState('');

  useEffect(() => {
    if (initData) {
      setStar(initData.star);
      setContent(initData.content);
    }
  }, [initData]);

  const handleCommit = () => {
    if (star !== undefined) {
      onSubmit({ star, content });
    }
  };

  return (
    <div className="py-5 px-4 border-t border-dashed border-gray-300 text-sm">
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
          className="grow leading-[16px] border rounded-full placeholder-[#BFBFBF] px-3 py-[7px]"
          placeholder={t('evaluation.content_hint')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button
          className="ml-2 text-[13px] leading-[30px]"
          disabled={star === undefined || loading}
          onClick={handleCommit}
        >
          {t('general.commit')}
        </Button>
      </div>
    </div>
  );
}
