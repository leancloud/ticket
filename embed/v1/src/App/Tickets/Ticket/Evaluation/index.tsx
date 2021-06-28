import { useState } from 'react';
import { CheckCircleIcon, ThumbDownIcon, ThumbUpIcon } from '@heroicons/react/solid';

import styles from './index.module.css';
import { Input } from 'components/Form';
import { Button } from 'components/Button';

interface RadioProps {
  id: string;
  checked: boolean;
  onChange: () => void;
  children: any;
}

function Radio({ id, checked, onChange, children }: RadioProps) {
  return (
    <span className="inline-flex items-center">
      <input
        type="radio"
        id={id}
        className={`${styles.radio} w-4 h-4 rounded-full border-tapBlue-600 border-2`}
        checked={checked}
        onChange={onChange}
      />
      <label className="inline-flex items-center ml-4 w-28" htmlFor={id}>
        {children}
      </label>
    </span>
  );
}

function Evaluated() {
  return (
    <div className="p-6 border-t border-dashed border-gray-300 text-gray-600 flex items-center">
      <CheckCircleIcon className="w-6 h-6 mr-3 text-tapBlue-600" /> 您的评价已收到，感谢您的反馈
    </div>
  );
}

function NewEvaluation() {
  const [useful, setUseful] = useState(true);

  return (
    <div className="p-6 border-t border-dashed border-gray-300">
      <div className="text-gray-600">服务评价与反馈</div>

      <div className="py-6">
        <Radio id="evaluation-good" checked={useful} onChange={() => setUseful(true)}>
          <span className="text-yellow-500 inline-flex items-center">
            <ThumbUpIcon className="w-4 h-4 inline-block mr-1" />
            有用
          </span>
        </Radio>

        <Radio id="evaluation-bad" checked={!useful} onChange={() => setUseful(false)}>
          <span className="text-blue-500 inline-flex items-center">
            <ThumbDownIcon className="w-4 h-4 inline-block mr-1" />
            没用
          </span>
        </Radio>
      </div>

      <div className="flex">
        <Input className="flex-grow rounded-full px-3" placeholder="补充说明（非必填）" />
        <Button className="ml-2 px-5">提交</Button>
      </div>
    </div>
  );
}

export function Evaluation() {
  return <Evaluated />;
}
