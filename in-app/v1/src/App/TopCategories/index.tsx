import { FC, useMemo } from 'react';
import { CategoryList, useCategories } from '@/App/Categories';
import { keyBy } from 'lodash-es';
import { useTranslation } from 'react-i18next';
import { QueryWrapper } from '@/components/QueryWrapper';
import { Helmet } from 'react-helmet-async';
import { PageContent, PageHeader } from '@/components/NewPage';

export const TopCategoryList: FC<{ marker: boolean }> = ({ marker }) => {
  const result = useCategories();
  const categories = result.data;

  const topCategories = useMemo(() => {
    if (!categories) {
      return [];
    }
    const map = keyBy(categories, 'id');
    return categories
      .filter((c) => c.parentId && !map[c.parentId])
      .sort((a, b) => a.position - b.position);
  }, [categories]);
  return (
    <QueryWrapper result={result}>
      <CategoryList marker={marker} categories={topCategories} />
    </QueryWrapper>
  );
};

export default function TopCategories() {
  const { t } = useTranslation();

  const result = useCategories();
  const title = result.isLoading ? t('general.loading') + '...' : '问题分类';

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeader>{t('feedback.submit')}</PageHeader>
      <PageContent shadow className="pb-0" title={t('category.select_hint')}>
        <TopCategoryList marker />
      </PageContent>
    </>
  );
}
