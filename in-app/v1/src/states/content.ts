import { atom, useRecoilValue, useSetRecoilState } from 'recoil';

export const contentAtom = atom({
  key: 'classify-content',
  default: '',
});

export const useSetContent = () => useSetRecoilState(contentAtom);
export const useContent = () => useRecoilValue(contentAtom);
