import { useEffect, useMemo, useState, FC } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/solid';
import classNames from 'classnames';
import { useArticle } from '@/api/article';
import { Category, useCategories, useFAQs } from '@/api/category';
import { Article } from '@/types';
import FillIcon from '@/icons/Fill';
import { NoData } from '@/components/NoData';
import { useRootCategory } from '@/states/root-category';
import { ArticleContent } from '@/App/Articles';
import { PageContent, PageHeader } from '@/components/Page';
import { QueryWrapper } from '@/components/QueryWrapper';
import { APIError } from '@/components/APIError';
import { Loading } from '@/components/Loading';
import { ArticleListItem } from '@/App/Articles/utils';
import styles from './index.module.css';
import { NotFoundContent } from '../NotFound';

interface ListItemProps {
  to: string;
  content: React.ReactNode;
  marker?: boolean;
  className?: string;
}

const FAQ_THRESHOLD = 4;

export function ListItem({ to, content, marker, className }: ListItemProps) {
  return (
    <Link to={to} className={`block border-b border-gray-100`}>
      <div className={classNames(`h-11 flex items-center text-[#666]`, className)}>
        {marker && <div className={styles.marker} />}
        <div className="grow truncate">{content}</div>
        <ChevronRightIcon className="shrink-0 h-4 w-4" />
      </div>
    </Link>
  );
}

export type CategoryListProps = JSX.IntrinsicElements['div'] & {
  categories: Category[];
  marker?: boolean;
};

export function CategoryList({ categories, marker, ...props }: CategoryListProps) {
  return (
    <div {...props}>
      {categories.map((category) => (
        <ListItem
          key={category.id}
          to={`/categories/${category.alias ?? category.id}`}
          marker={marker}
          content={category.name}
        />
      ))}
    </div>
  );
}
export const FAQs: FC<{ faqs?: Article[]; className?: string }> = ({ faqs = [], className }) => {
  const [showAll, setShowAll] = useState(faqs.length <= FAQ_THRESHOLD);
  const [t] = useTranslation();

  useEffect(() => {
    setShowAll(faqs.length <= FAQ_THRESHOLD);
  }, [faqs]);

  if (!faqs.length) {
    return null;
  }

  const data = showAll ? faqs : faqs.slice(0, 3);

  return (
    <PageContent shadow className={classNames(className)} title={t('category.faqs')}>
      <div className="-mb-3">
        {data.map((FAQ, i) => (
          <ArticleListItem
            article={FAQ}
            key={FAQ.id}
            className={classNames(data.length - 1 === i && 'border-b-0', '!h-[42px]')}
          />
        ))}
        {faqs.length > FAQ_THRESHOLD && !showAll && (
          <button
            className="flex items-center text-[#BFBFBF] pt-1 pb-3 text-[12px] leading-[16px]"
            onClick={() => setShowAll(true)}
          >
            {t('faqs.showAll')} <ChevronDownIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </PageContent>
  );
};

export default function Categories() {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const result = useCategories();
  const { data: categories, isLoading: categoriesIsLoading, error } = result;
  const { t } = useTranslation();
  const rootCategory = useRootCategory();
  const currentCategory = useMemo(
    () => categories?.find((c) => c.id === rawId || c.alias === rawId),
    [categories, rawId]
  );

  const id = currentCategory?.id;
  const articleId = currentCategory?.articleId;
  const subCategories = useMemo(
    () =>
      categories
        ?.filter((c) => !c.hidden)
        .filter((c) => c.parentId === id)
        .sort((a, b) => a.position - b.position),
    [categories, id]
  );
  const noSubCategories = subCategories && subCategories.length === 0;

  const { data: faqs, isLoading: FAQsIsLoading } = useFAQs(id, {
    enabled: noSubCategories,
  });

  const { data: article, isFetching: ArticleIsLoading } = useArticle(articleId!, {
    enabled: !!articleId && noSubCategories,
  });

  const noData = categories?.length === 0 && faqs?.length === 0;
  const isLoading = categoriesIsLoading || FAQsIsLoading || ArticleIsLoading;

  const isShowArticle = !!article;

  const title = isLoading ? t('general.loading') + '...' : currentCategory?.name;

  const content = (() => {
    if (error) return <APIError />;
    if (isLoading) return <Loading />;
    if (!currentCategory) return <NotFoundContent />;
    if (noSubCategories) {
      return (
        <>
          {isShowArticle && (
            <PageContent shadow className={'py-0 px-0 mb-3'}>
              <ArticleContent article={article} showTitle={false} />
            </PageContent>
          )}
          <FAQs faqs={faqs} className="mb-3" />
          {currentCategory.isTicketEnabled && (
            <Feedback
              id={currentCategory.id}
              ticketDescription={
                currentCategory.ticketDescription || rootCategory.ticketDescription
              }
            />
          )}
        </>
      );
    }
    return (
      <PageContent shadow title={t('category.select_hint')}>
        {!noSubCategories && (
          <div className="-mb-3">
            <CategoryList categories={subCategories!} />
          </div>
        )}
      </PageContent>
    );
  })();

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeader>{title}</PageHeader>
      <QueryWrapper result={result} noData={noData}>
        {content}
      </QueryWrapper>
    </>
  );
}

function Feedback({
  id,
  ticketDescription,
  className,
}: {
  id?: string;
  ticketDescription?: string;
  className?: string;
}) {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const isPreview = !id;
  const onCreateTicket = () => {
    if (isPreview) {
      return;
    }
    navigate({ pathname: `/tickets/new`, search: `?category_id=${id}` });
  };

  return (
    <PageContent shadow className={classNames(className, 'mb-3')} title={t('feedback.title')}>
      <div className="mt-3 flex flex-row justify-between ">
        <div
          onClick={onCreateTicket}
          className="basis-1/2 grow-0 mr-2 px-4 py-3 border rounded-lg cursor-pointer"
        >
          <div className="flex flex-row items-center">
            <div className="w-[18px]">
              <FillIcon />
            </div>
            <div className="ml-4">
              <h4>{t('feedback.submit_ticket')}</h4>
              {ticketDescription && (
                <p className="text-[10px] text-[#888] break-all">{ticketDescription}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContent>
  );
}

interface PreviewData {
  articleId?: string;
  faqs?: Article[];
  category: Pick<Category, 'name' | 'isTicketEnabled' | 'ticketDescription'>;
}

export function Preview() {
  const [t] = useTranslation();
  const [search] = useSearchParams();
  const configs = search.get('configs');
  if (!configs) {
    throw new Error('预览配置为空');
  }

  const data = JSON.parse(configs) as PreviewData;
  const { faqs, articleId, category } = data;
  const { data: article } = useArticle(articleId!, {
    enabled: !!articleId,
  });
  const noData = faqs?.length === 0 && !articleId && !category.isTicketEnabled;

  const content = (
    <>
      {article && (
        <PageContent shadow className={'py-0 px-0 mb-3'}>
          <ArticleContent article={article} showTitle={false} />
        </PageContent>
      )}
      <FAQs faqs={faqs} className="mb-3" />
      {category.isTicketEnabled && <Feedback ticketDescription={category.ticketDescription} />}
    </>
  );

  return (
    <>
      <Helmet>
        <title>{category.name}</title>
      </Helmet>
      <PageHeader>{category.name}</PageHeader>
      {noData ? <NoData message={t('category.empty')} /> : content}
    </>
  );
}
