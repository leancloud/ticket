import { useParams, Link } from 'react-router-dom';
import { intlFormat } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Breadcrumb } from '@/components/Breadcrumb';
import { MdTopic } from 'react-icons/md';
import { QueryWrapper } from '@/components/QueryWrapper';
import { useCategoryTopics } from '@/api/category';

export default function Topic() {
  const { t } = useTranslation();
  const { topicId } = useParams();

  const result = useCategoryTopics();
  const { data } = result;
  const topic = data?.find((item) => item.id === topicId);

  return (
    <QueryWrapper result={result}>
      <div className="content">
        {topic && (
          <>
            <Helmet>
              <title>{topic.name}</title>
              <meta property="og:type" content="topic" />
              <meta property="og:title" content={topic.name} />
              <meta property="og:description" content={topic.name} />
            </Helmet>
            <Breadcrumb items={[{ title: topic.name }]} />
            <div className="content-inner mt-4">
              <div className="flex items-center text-2xl px-4">
                <MdTopic className="mr-2 text-[42px]" />
                {topic.name}
              </div>
              <div className="mt-5 rounded overflow-hidden bg-background">
                {topic.articles.map((item) => (
                  <Link
                    className="block p-4 border-b-[1px] last:border-0 text-neutral "
                    to={`/topic/${topic.id}/article/${item.slug}`}
                    key={item.id}
                  >
                    <p className="truncate text-[16px]">{item.title}</p>
                    <div className="pt-1 text text-neutral-600">
                      {t('general.update_at')}: {intlFormat(new Date(item.updatedAt))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </QueryWrapper>
  );
}
