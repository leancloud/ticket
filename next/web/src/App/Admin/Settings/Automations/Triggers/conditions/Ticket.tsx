import { Controller, useFormContext } from 'react-hook-form';

import { Select } from '@/components/antd';

const OPS = [
  { label: '被创建', value: 'created' },
  { label: '被更新', value: 'updated' },
  { label: '被回复', value: 'replied' },
];

export function Ticket({ path }: { path: string }) {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={`${path}.op`}
      defaultValue="created"
      render={({ field }) => <Select {...field} options={OPS} style={{ width: 180 }} />}
    />
  );
}
