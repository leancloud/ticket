import { Spin } from '@/components/antd';

export function LoadingCover() {
  return (
    <div className="absolute inset-0 bg-white opacity-60 z-[1] flex justify-center items-center">
      <Spin />
    </div>
  );
}
