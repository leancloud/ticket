import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { PageContent, PageHeader } from '@/components/NewPage';
import { useCategories } from '@/App/Categories';
import { useCategoryTopics } from '@/api/category';
import { Loading } from '@/components/Loading';
import { QueryWrapper } from '@/components/QueryWrapper';
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

  const { data: topics, isLoading: isTopicsLoading } = useCategoryTopics();
  const enableCategories = !isTopicsLoading && topics?.length === 0;
  const { isLoading: isCategoriesLoading } = useCategories({
    enabled: enableCategories,
  });
  const isLoading = isTopicsLoading && isCategoriesLoading;
  const title = !isLoading ? t(enableCategories ? 'category.select_hint' : 'topic.title') : '';

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
        <div className="text-center text-[#BFBFBF] mt-6">{t('topic.hint')}</div>
      )}
      <Help feedback={!enableCategories} />
    </>
  );
}
