import { useQuery } from 'react-query'

import { getCategoriesTree } from '../common'

export function useCategoriesTree(hideDisabled) {
  return useQuery(['categoriesTree', hideDisabled], () => getCategoriesTree(hideDisabled))
}
