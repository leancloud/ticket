import { useQuery } from 'react-query';

import { http } from '@/leancloud';
import { EvaluationTag } from '@/types';

export async function getEvaluationTag() {
  const res = await http.get<EvaluationTag>('/api/2/evaluation-tag');
  return res.data;
}

export function useEvaluationTag() {
  return useQuery({
    queryKey: ['EvaluationTag'],
    queryFn: getEvaluationTag,
    staleTime: Infinity,
  });
}
