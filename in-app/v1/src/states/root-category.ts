import { atom, useRecoilValue, useSetRecoilState } from 'recoil';

const rootCategoryState = atom<string>({
  key: 'rootCategory',
});

export function useSetRootCategory() {
  return useSetRecoilState(rootCategoryState);
}

export function useRootCategory() {
  return useRecoilValue(rootCategoryState);
}
