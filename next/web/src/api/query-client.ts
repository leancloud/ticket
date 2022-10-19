import { QueryClient } from 'react-query';
import { message } from '@/components/antd';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      onError: (error) => {
        if (error instanceof Error) {
          message.error(error.message);
        } else {
          message.error('未知错误');
        }
      },
    },
  },
});
