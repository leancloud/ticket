import { QueryClient } from 'react-query';
import { message } from '@/components/antd';

const onError = (error: unknown) => {
  if (error instanceof Error) {
    message.error(error.message);
  } else {
    message.error('未知错误');
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      onError,
    },
    mutations: {
      onError,
    },
  },
});
