import { QueryClient } from 'react-query';
import axios from 'axios';
import { message } from '@/components/antd';

const onError = (error: unknown) => {
  let errorMessage = '未知错误';
  if (error instanceof Error) {
    errorMessage = error.message;
  }
  if (axios.isAxiosError(error) && error.response) {
    if (typeof error.response.data?.message === 'string') {
      errorMessage = error.response.data.message;
    }
    if (error.response.status === 401) {
      if (window.location.pathname.startsWith('/next/tickets/new')) {
        window.postMessage('requireAuth');
      } else {
        window.location.href = '/login';
      }
    }
  }
  message.error(errorMessage);
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
