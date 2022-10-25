import { http } from '@/leancloud';
import { useQuery, UseQueryOptions } from 'react-query';

async function createTapSupportAuthToken() {
  const res = await http.post<{ token: string }>('/api/2/tap-support/auth-tokens');
  return res.data.token;
}

export function useTapSupportAuthToken(options?: UseQueryOptions<string, Error>) {
  return useQuery({
    queryKey: ['tapSupportAuthToken'],
    queryFn: createTapSupportAuthToken,
    ...options,
  });
}
