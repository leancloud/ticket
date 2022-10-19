import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { PageContent, PageHeader } from '@/components/NewPage';
import { useCategories } from '@/App/Categories';
import { useCategoryTopics } from '@/api/category';
import { Loading } from '@/components/Loading';
import { QueryWrapper } from '@/components/QueryWrapper';
import { useNotices } from '@/App/Articles/utils';
import { useRootCategory } from '@/App';
import Topics from './Topics';
import { TopCategoryList } from '../TopCategories';
import Help from './Help';
import Notices from './Notices';

const Categories: FC = () => {
  const result = useCategories();
  return (
    <QueryWrapper result={result}>
      <TopCategoryList marker />
    </QueryWrapper>
  );
};

export default function Home() {
  const { t } = useTranslation();
  const rootCategory = useRootCategory();
  const { isLoading: isNoticesLoading } = useNotices(rootCategory);
  const { data: topics, isLoading: isTopicsLoading } = useCategoryTopics();
  const enableCategories = !isTopicsLoading && topics?.length === 0;
  const { isLoading: isCategoriesLoading } = useCategories({
    enabled: enableCategories,
  });
  const isLoading = isNoticesLoading && isTopicsLoading && isCategoriesLoading;
  const title = !isLoading ? t(enableCategories ? 'category.select_hint_home' : 'topic.title') : '';

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <PageHeader />
      <Notices />
      <PageContent shadow title={title} className="pb-0">
        {!enableCategories && <Topics />}
        {enableCategories && <Categories />}
      </PageContent>
      {!enableCategories && (
        <div className="text-center text-[#BFBFBF] mt-6 mb-3">{t('topic.hint')}</div>
      )}
      <Help feedback={!enableCategories} />
    </>
  );
}
