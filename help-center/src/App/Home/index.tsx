import { useEffect } from 'react';
import { useCategories, useCategoryTopics, useNotices } from '@/api/category';
import { useRootCategory } from '@/states/root-category';
import Topics from './Topics';
import Notices from './Notices';
import { useNavigate } from 'react-router-dom';
import { Loading } from '@/components/Loading';
import Help from './Help';

export default function Home() {
  const category = useRootCategory();
  const navigate = useNavigate();

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

  const { data: categories, isLoading: isCategoriesLoading } = useCategories({
    enabled: !isTopicsLoading && !hasTopics,
  });

  const hasCategories = categories !== undefined && categories.length > 0;

  const isLoading = isNoticesLoading || isTopicsLoading || isCategoriesLoading;
  const isNoData = !hasNotices && !hasTopics && !hasCategories;

  useEffect(() => {
    if (!isLoading && isNoData) {
      navigate('/categories', { replace: true });
    }
  }, [isLoading, isNoData]);

  return (
    <div className="content flex flex-col bg-white flex-1">
      {isLoading && <Loading />}
      {!isLoading && (
        <>
          {hasNotices && <Notices />}
          {hasTopics && <Topics data={topics} />}
        </>
      )}
      <Help />
    </div>
  );
}
