import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { keyBy } from 'lodash-es';
import { Category, useCategories } from '@/api/category';
import { Loading } from '@/components/Loading';
import { PageContent, PageHeader } from '@/components/Page';
import { CategoryList } from '@/App/Categories';

interface TopCategoryListProps {
  categories?: Category[];
}

export function TopCategoryList({ categories }: TopCategoryListProps) {
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
    <div className="-mb-3">
      <CategoryList marker={true} categories={topCategories} />
    </div>
  );
}

export default function TopCategories() {
  const { t } = useTranslation();

  const { data, isLoading } = useCategories();
  const title = isLoading ? t('general.loading') + '...' : t('category.title');

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeader>{t('feedback.title')}</PageHeader>
      <PageContent shadow title={t('category.select_hint_home')}>
        {isLoading && <Loading />}
        {data && <TopCategoryList categories={data} />}
      </PageContent>
    </>
  );
}
