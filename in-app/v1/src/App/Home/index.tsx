import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '@heroicons/react/solid';
import { PageContent, PageHeader } from '@/components/Page';
import SpeakerIcon from '@/icons/Speaker';
import { useRootCategory } from '@/states/root-category';
import { useCategories, useCategoryTopics } from '@/api/category';
import { useNotices, ArticleLink } from '@/App/Articles/utils';
import { Loading } from '@/components/Loading';
import { QueryWrapper } from '@/components/QueryWrapper';
import Topics from './Topics';
import TicketsLink from './TicketsLink';
import { TopCategoryList } from '../TopCategories';

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
  const { data: notices } = useNotices(rootCategory.id);
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
      <PageContent>
        {notices && notices.length > 0 && (
          <div className="px-3 mt-1 text-sm">
            {notices.map((notice) => (
              <ArticleLink
                article={notice}
                key={notice.id}
                className="my-1 px-2.5 py-2 rounded flex items-center bg-tapBlue bg-opacity-5 active:bg-tapBlue-50"
              >
                <SpeakerIcon className="text-tapBlue shrink-0" />
                <span className="grow truncate ml-2 mr-1">{notice.title}</span>
                <ChevronRightIcon className="shrink-0 h-4 w-4 text-tapBlue" />
              </ArticleLink>
            ))}
          </div>
        )}

        <div className="flex items-center h-[46px] px-4 mt-1">
          <h2 className="grow font-bold">{title}</h2>
          <TicketsLink />
        </div>
        {!enableCategories && <Topics />}
        {enableCategories && <Categories />}
      </PageContent>
    </>
  );
}
