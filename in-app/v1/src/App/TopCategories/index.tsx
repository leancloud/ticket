import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { keyBy } from 'lodash-es';
import { useCategories } from '@/api/category';
import { QueryWrapper } from '@/components/QueryWrapper';
import { PageContent, PageHeader } from '@/components/Page';
import { CategoryList } from '@/App/Categories';

export const TopCategoryList: FC = () => {
  const result = useCategories();
  const categories = result.data;

  const topCategories = useMemo(() => {
    if (!categories) {
      return [];
    }
    const map = keyBy(categories, 'id');
    return categories
      .filter((c) => !c.hidden)
      .filter((c) => c.parentId && !map[c.parentId])
      .sort((a, b) => a.position - b.position);
  }, [categories]);
  return (
    <QueryWrapper result={result}>
      <div className="-mb-3">
        <CategoryList marker={true} categories={topCategories} />
      </div>
    </QueryWrapper>
  );
};

export default function TopCategories() {
  const { t } = useTranslation();

  const result = useCategories();
  const title = result.isLoading ? t('general.loading') + '...' : t('category.title');

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeader>{t('feedback.submit')}</PageHeader>
      <PageContent shadow title={t('category.select_hint_home')}>
        <TopCategoryList />
      </PageContent>
    </>
  );
}
