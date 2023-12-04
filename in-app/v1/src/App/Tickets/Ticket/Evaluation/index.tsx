import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';

import { useEvaluationTag } from '@/api/evaluation';
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
  content?: string;
  selections?: string[];
}

export interface NewEvaluationProps {
  initData?: EvaluationData | null;
  loading?: boolean;
  onSubmit: (data: EvaluationData) => void;
}

export function NewEvaluation({ initData, loading, onSubmit }: NewEvaluationProps) {
  const { t } = useTranslation();
  const [evaluation, setEvaluation] = useState<Partial<EvaluationData>>({});

  useEffect(() => {
    if (initData) {
      setEvaluation(initData);
    }
  }, [initData]);

  const { data: tag, isLoading: isLoadingTag } = useEvaluationTag();

  const handleCommit = () => {
    if (evaluation.star !== undefined) {
      onSubmit(evaluation as EvaluationData);
    }
  };

  if (isLoadingTag) {
    return null;
  }

  const currentTag =
    tag && evaluation.star !== undefined
      ? evaluation.star
        ? tag.positive
        : tag.negative
      : undefined;

  const displayInput = currentTag?.required
    ? !!evaluation.selections?.length
    : evaluation.star !== undefined;

  return (
    <div className="py-5 px-4 border-t border-dashed border-gray-300 text-sm">
      <div className="text-gray-600">{t('evaluation.title')}</div>

      <div className="my-6">
        <span>
          <Radio
            checked={evaluation.star === 1}
            onChange={() => setEvaluation({ ...evaluation, star: 1, selections: [] })}
          >
            <span className="inline-flex items-center text-[#FF8156]">
              <ThumbUpIcon className="w-[14px] h-[14px] inline-block mr-1" />
              {t('evaluation.useful')}
            </span>
          </Radio>
        </span>
        <span className="ml-14">
          <Radio
            checked={evaluation.star === 0}
            onChange={() => setEvaluation({ ...evaluation, star: 0, selections: [] })}
          >
            <span className="inline-flex items-center text-[#3AB1F3]">
              <ThumbDownIcon className="w-[14px] h-[14px] inline-block mr-1" />
              {t('evaluation.useless')}
            </span>
          </Radio>
        </span>
      </div>

      {currentTag && currentTag.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentTag.options.map((option) => {
            const active = evaluation.selections?.includes(option);
            return (
              <button
                className={cx(
                  'px-2 py-1 rounded',
                  active ? 'bg-tapBlue text-white font-bold' : 'bg-[#F5F7F8] text-[#868C92]'
                )}
                onClick={() => {
                  if (active) {
                    setEvaluation({
                      ...evaluation,
                      selections: evaluation.selections?.filter((t) => t !== option),
                    });
                  } else {
                    setEvaluation({
                      ...evaluation,
                      selections: [option],
                    });
                  }
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}

      {displayInput && (
        <div className="flex items-center mt-6">
          <input
            className="grow leading-[16px] border rounded-full placeholder-[#BFBFBF] px-3 py-[7px]"
            placeholder={t('evaluation.content_hint')}
            value={evaluation.content}
            onChange={(e) => setEvaluation({ ...evaluation, content: e.target.value })}
          />
          <Button
            className="ml-2 text-[13px] leading-[30px]"
            disabled={loading}
            onClick={handleCommit}
          >
            {t('general.commit')}
          </Button>
        </div>
      )}
    </div>
  );
}
