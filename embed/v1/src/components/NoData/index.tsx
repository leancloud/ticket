import { Center } from '../Center';

export interface NoDataProps {
  message?: string;
}

export function NoData({ message }: NoDataProps) {
  return (
    <Center>
      <div className="text-gray-300">{message || '暂无数据'}</div>
    </Center>
  );
}
