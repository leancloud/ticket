import { UseQueryOptions, useQuery, UseMutationOptions, useMutation, useQueryClient } from 'react-query';
import { http } from '@/leancloud';

async function fetchConfig<T>(key: string) {
  const { data } = await http.get<T>(`/api/2/config/${key}`);
  return data
}

async function updateConfig<T>(key: string, value: T) {
  const { data } = await http.patch<T>(`/api/2/config/${key}`, value)
  return data
}

export const useConfig = <T>(key: string, options?: UseQueryOptions<T, Error>) => useQuery({
  queryKey: ['config', key],
  queryFn: () => fetchConfig<T>(key),
  ...options,
});

export const useUpdateConfig = <T>(key: string, options?: UseMutationOptions<T, Error, T>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value) => updateConfig(key, value).then(data => {
      queryClient.setQueryData(['config', key], data);
      return data
    }),
    ...options,
    onSuccess: ((data, ...rest) => {
      queryClient.setQueryData(['config', key], data);
      if (options?.onSuccess) {
        options?.onSuccess(data, ...rest)
      }
    })
  });
}

