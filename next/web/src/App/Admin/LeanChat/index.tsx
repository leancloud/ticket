import { Button } from 'antd';
import { AiOutlineLink } from 'react-icons/ai';
import { useMutation } from 'react-query';

import { http } from '@/leancloud';

export default function LeanChat() {
  const leanchatUrl = import.meta.env.VITE_LEANCHAT_URL;

  const { mutate: toLeanChat, isLoading } = useMutation({
    mutationFn: async () => {
      const res = await http.post<{ token: string }>('/api/2/leanchat/login-token');
      return res.data.token;
    },
    onSuccess: (token) => {
      if (leanchatUrl) {
        const url = new URL(leanchatUrl);
        url.pathname = '/login';
        url.searchParams.set('token', token);
        window.open(url, '_blank');
      }
    },
  });

  return (
    <div className="p-5">
      {leanchatUrl ? (
        <Button type="primary" disabled={isLoading} onClick={() => toLeanChat()}>
          <div className="flex items-center">
            <AiOutlineLink className="w-4 h-4 -ml-1 mr-1" />
            转到在线客服
          </div>
        </Button>
      ) : (
        '暂未开启'
      )}
    </div>
  );
}
