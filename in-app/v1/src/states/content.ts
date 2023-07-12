import { ClassifyResult, classifyTicket } from '@/api/category';
import {
  atom,
  selectorFamily,
  useRecoilValue,
  useRecoilValueLoadable,
  useSetRecoilState,
} from 'recoil';

export const contentAtom = atom({
  key: 'classify-content',
  default: '',
});

export const categoryState = selectorFamily<ClassifyResult | undefined, string>({
  key: 'classifiedResult',
  get: (categoryId: string) => ({ get }) => {
    const content = get(contentAtom);

    if (content) {
      return classifyTicket(categoryId, content)
        .then((v) => v)
        .catch((err) => {
          console.error(err);
          return { status: 'failed' } as const;
        });
    }
  },
});

export const useSetContent = () => useSetRecoilState(contentAtom);
export const useContent = () => useRecoilValue(contentAtom);

export const useClassifyCategoryLoadable = (categoryId: string) =>
  useRecoilValueLoadable(categoryState(categoryId));

export const useClassifyCategory = (categoryId: string) =>
  useRecoilValue(categoryState(categoryId));
