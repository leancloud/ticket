import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useCategories, useCategoryTopics, useNotices } from '@/api/category';
import { useRootCategory } from '@/states/root-category';
import { Loading } from '@/components/Loading';
import { PageContent, PageHeader } from '@/components/Page';
import { NotFoundContent } from '@/App/NotFound';
import { TopCategoryList } from '../TopCategories';
import Topics from './Topics';
import Help from './Help';
import Notices from './Notices';

export default function Home() {
  const { t } = useTranslation();
  const category = useRootCategory();

  const { data: notices, isLoading: isNoticesLoading } = useNotices(category.id);
  const { data: topics, isLoading: isTopicsLoading } = useCategoryTopics();

  const hasNotices = notices !== undefined && notices.length > 0;
  const hasTopics = topics !== undefined && topics.length > 0;

  const enableFeedback = !category.meta?.disableFeedback;
  const showCategories = enableFeedback && !isTopicsLoading && !hasTopics;

  const { data: categories, isLoading: isCategoriesLoading } = useCategories({
    enabled: showCategories,
  });

  const hasCategories = categories !== undefined && categories.length > 0;

  const isLoading = isNoticesLoading || isTopicsLoading || isCategoriesLoading;
  const isNoData = !hasNotices && !hasTopics && !hasCategories;

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Loading className="m-auto" />
      </div>
    );
  }

  const content = isNoData ? (
    <PageContent shadow>
      <NotFoundContent message={t('home.empty')} />
    </PageContent>
  ) : (
    <>
      <Notices />
      <PageContent
        shadow
        title={showCategories ? t('category.select_hint_home') : t('topic.title')}
      >
        {hasTopics && <Topics data={topics} />}
        {showCategories && hasCategories && <TopCategoryList categories={categories} />}
      </PageContent>
    </>
  );

  return (
    <>
      <PageHeader />
      {content}
      {hasTopics && enableFeedback && (
        <div className="text-center text-gray-400 opacity-80 mt-6 mb-3">
          {t('topic.hint')}{' '}
          <Link to="/categories" className="text-tapBlue">
            {t('feedback.submit')}
          </Link>
        </div>
      )}
      {enableFeedback && <Help feedback={!showCategories} />}
    </>
  );
}
