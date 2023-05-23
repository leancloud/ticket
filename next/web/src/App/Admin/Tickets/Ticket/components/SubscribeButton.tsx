import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

import { Button, ButtonProps } from '@/components/antd';

interface SubscribeButtonProps extends ButtonProps {
  subscribed?: boolean;
}

export function SubscribeButton({ subscribed, ...props }: SubscribeButtonProps) {
  const Icon = subscribed ? AiOutlineEyeInvisible : AiOutlineEye;

  return (
    <Button {...props} icon={<Icon className="inline w-4 h-4 mr-1 align-text-bottom" />}>
      {subscribed ? '取消关注' : '关注'}
    </Button>
  );
}
