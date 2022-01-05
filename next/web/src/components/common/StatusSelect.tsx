import { forwardRef } from 'react';
import { RefSelectProps } from 'antd/lib/select';

import { Select, SelectProps } from '@/components/antd';

const options = [
  { value: 50, label: '新工单' },
  { value: 120, label: '等待客服回复' },
  { value: 160, label: '已回复用户' },
  { value: 220, label: '待用户确认' },
  { value: 250, label: '已解决' },
  { value: 280, label: '已关闭' },
];

export interface StatusSelectProps extends SelectProps<number | number[]> {}

export const StatusSelect = forwardRef<RefSelectProps, StatusSelectProps>((props, ref) => {
  return <Select {...props} ref={ref} options={options} />;
});
