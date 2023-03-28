import { useEffect, useMemo, useState, FC } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/solid';
import classNames from 'classnames';

import { Category, useCategories, useFAQs } from '@/api/category';
import { Article } from '@/types';
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

  const currentCategory = useMemo(
    () => categories?.find((c) => c.id === rawId || c.alias === rawId),
    [categories, rawId]
  );
  const id = currentCategory?.id;

  const subCategories = useMemo(
    () =>
      categories
        ?.filter((c) => !c.hidden)
        .filter((c) => c.parentId === id)
        .sort((a, b) => a.position - b.position),
    [categories, id]
  );
  const noSubCategories = subCategories && subCategories.length === 0;

  const { data: faqs, isLoading: FAQsIsLoading, isSuccess: FAQsIsReady } = useFAQs(
    noSubCategories ? undefined : id
  );

  const redirectToNewTicket = noSubCategories;
  const noData = categories?.length === 0 && faqs?.length === 0;

  useEffect(() => {
    if (redirectToNewTicket) {
      navigate(`/tickets/new?category_id=${id}`, { replace: true });
    }
  }, [redirectToNewTicket, navigate, id]);

  const isLoading = categoriesIsLoading || FAQsIsLoading;
  const title = isLoading ? t('general.loading') + '...' : currentCategory?.name;

  const content = (() => {
    if (error) return <APIError />;
    if (isLoading) return <Loading />;
    if (!currentCategory) return <NotFoundContent />;
    if (noSubCategories) {
      return null;
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
      <PageHeader>
        {title}
        {t('feedback.suffix')}
      </PageHeader>
      <QueryWrapper result={result} noData={noData}>
        {content}
        <FAQs faqs={faqs} className="mt-6" />
      </QueryWrapper>
    </>
  );
}
