import { useTranslation } from 'react-i18next';

import { useCategories, useCategoryTopics, useNotices } from '@/api/category';
import { useRootCategory } from '@/states/root-category';
import { Loading } from '@/components/Loading';
import { PageContent, PageHeader } from '@/components/Page';
import { NotFoundContent } from '@/App/NotFound';
import { TopCategoryList } from '../TopCategories';
import Topics from './Topics';
import Help from './Help';
import Notices from './Notices';
import { AiClassify } from './AiClassify';
import { Link } from 'react-router-dom';

export default function Home() {
  const { t } = useTranslation();
  const category = useRootCategory();

  const noticesEnabled = !!category.noticeIds?.length;
  const topicsEnabled = !!category.topicIds?.length;

  const { data: notices, isLoading: isNoticesLoading } = useNotices(category.id, {
    enabled: noticesEnabled,
  });
  const { data: topics, isLoading: isTopicsLoading } = useCategoryTopics({
    enabled: topicsEnabled,
  });

  const hasNotices = !!notices?.length;
  const hasTopics = !!topics?.length;

  const enableFeedback = !category.meta?.disableFeedback;
  const showCategories = enableFeedback && !isTopicsLoading && !hasTopics;

  const { data: categories, isLoading: isCategoriesLoading } = useCategories({
    enabled: showCategories,
  });

  const hasCategories = categories !== undefined && categories.length > 0;

  const isLoading = isNoticesLoading || isTopicsLoading || isCategoriesLoading;
  const isNoData = !hasNotices && !hasTopics && !hasCategories;

  if (isLoading) {
    return <Loading fullScreen />;
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
      {enableFeedback &&
        (!category.meta?.enableAIClassify ? (
          !!hasTopics && (
            <div className="text-center text-gray-400 opacity-80 mt-6 mb-3">
              {t('topic.hint')}{' '}
              <Link to="/categories" className="text-tapBlue">
                {t('feedback.title')}
              </Link>
            </div>
          )
        ) : (
          <AiClassify className="mt-3" />
        ))}
      {enableFeedback && <Help feedback={!showCategories} />}
    </>
  );
}
