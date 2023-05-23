import { AiOutlineLock, AiOutlineUnlock } from 'react-icons/ai';

import { Select, SelectProps } from '@/components/antd';

interface PrivateSelectProps extends SelectProps {
  value?: boolean;
  onChange: (value: boolean) => void;
}

export function PrivateSelect({ value, onChange, ...props }: PrivateSelectProps) {
  return (
    <Select
      {...props}
      options={[
        {
          label: (
            <span>
              <AiOutlineUnlock className="inline w-4 h-4 align-text-bottom" /> 员工可见
            </span>
          ),
          value: 'internal',
        },
        {
          label: (
            <span>
              <AiOutlineLock className="inline w-4 h-4 align-text-bottom" /> 仅客服可见
            </span>
          ),
          value: 'private',
        },
      ]}
      value={value ? 'private' : 'internal'}
      onChange={(value) => onChange(value === 'private')}
    />
  );
}
