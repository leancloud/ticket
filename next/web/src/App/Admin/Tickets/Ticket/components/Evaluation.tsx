import { FiThumbsDown, FiThumbsUp } from 'react-icons/fi';
import { Tag } from 'antd';
import cx from 'classnames';

interface EvaluationProps {
  className?: string;
  evaluation: {
    star: number;
    content: string;
    selections?: string[];
  };
}

export function Evaluation({ className, evaluation }: EvaluationProps) {
  const Icon = evaluation.star ? FiThumbsUp : FiThumbsDown;

  return (
    <div
      className={cx(className, 'border rounded p-3', {
        'bg-[#d3f1da] border-[#c1eccb]': evaluation.star === 1,
        'bg-[#f8d7da] border-[#f5c6cb]': evaluation.star === 0,
      })}
    >
      <div
        className={cx('mb-3 flex items-center', {
          'text-[#116124]': evaluation.star === 1,
          'text-[#721c24]': evaluation.star === 0,
        })}
      >
        <Icon className="w-8 h-8 mr-3" />
        <div>对工单处理结果的评价:</div>
      </div>
      {evaluation.selections && evaluation.selections.length > 0 && (
        <div className="mb-2">
          {evaluation.selections?.map((selection) => (
            <Tag key={selection}>{selection}</Tag>
          ))}
        </div>
      )}
      <div>{evaluation.content}</div>
    </div>
  );
}
