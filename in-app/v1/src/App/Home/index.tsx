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
  const enableFeedback = !category.meta?.disableFeedback;
  const { isLoading: isNoticesLoading, data: notices } = useNotices(category.id);
  const { data: topics, isLoading: isTopicsLoading } = useCategoryTopics();
  const showTopics = topics && topics.length > 0;
  const showCategories = enableFeedback && !isTopicsLoading && !showTopics;
  const { isLoading: isCategoriesLoading, data: categories } = useCategories({
    enabled: showCategories,
  });
  const isLoading = isNoticesLoading && isTopicsLoading && isCategoriesLoading;
  const title = !isLoading ? t(showCategories ? 'category.select_hint_home' : 'topic.title') : '';
  const isNoData =
    notices && !notices.length && topics && !topics.length && categories && !categories.length;

  if (isLoading) {
    return <Loading />;
  }

  const content = isNoData ? (
    <PageContent shadow>
      <NotFoundContent message={t('home.empty')} />
    </PageContent>
  ) : (
    <>
      <Notices />
      <PageContent shadow title={title}>
        {showTopics && <Topics data={topics} />}
        {showCategories && !!categories?.length && <TopCategoryList />}
      </PageContent>
    </>
  );

  return (
    <>
      <PageHeader />
      {content}
      {showTopics && enableFeedback && (
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
