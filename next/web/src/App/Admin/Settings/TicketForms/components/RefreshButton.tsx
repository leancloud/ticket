import { AiOutlineReload } from 'react-icons/ai';
import { Button, ButtonProps } from '@/components/antd';

export function RefreshButton(props: ButtonProps) {
  return (
    <Button size="small" title="刷新" {...props} icon={<AiOutlineReload className="m-auto" />} />
  );
}
