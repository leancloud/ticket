import { Category } from '@/api/category';
import { atom, useRecoilValue, useSetRecoilState } from 'recoil';

const rootCategoryState = atom<Category>({
  key: 'rootCategory',
});

export function useSetRootCategory() {
  return useSetRecoilState(rootCategoryState);
}

export function useRootCategory() {
  return useRecoilValue(rootCategoryState);
}
