import {
  useArticle,
  useArticleTranslations,
  useRelatedCategories,
  useUpdateArticle,
} from '@/api/article';
import { Breadcrumb, Spin, message } from '@/components/antd';
import { FC, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FeedbackSummary } from './FeedbackSummary';
import { EditArticleForm } from './EditArticleForm';
import { LOCALES } from '@/i18n/locales';
import { LocaleModal } from '../../components/LocaleModal';
import { SetDefaultButton } from './components/SetDefaultButton';
import { CategorySchema } from '@/api/category';
import { useGetCategoryPath, CategoryPath } from '../../components/CategoryPath';
import { PreviewLink } from './components/PreviewLink';
import { TranslationList } from '@/App/Admin/components/TranslationList';

interface ArticleTranslationListProps {
  articleId: string;
  defaultLanguage?: string;
}

const ArticleTranslationList: FC<ArticleTranslationListProps> = ({
  articleId,
  defaultLanguage,
}) => {
  const { data: translations, isLoading } = useArticleTranslations(articleId);
  const navigate = useNavigate();

  const [show, setShow] = useState(false);

  const existLanguages = useMemo(() => translations?.map(({ language }) => language) ?? [], [
    translations,
  ]);

  return (
    <>
      <TranslationList
        data={translations}
        header="文章翻译"
        loading={isLoading}
        title={(item) => `${item.title} - ${LOCALES[item.language]}`}
        action={(item) => (
          <>
            <FeedbackSummary revision={item.revision!} />
            <PreviewLink slug={item.slug} language={item.language} />
            <Link to={`${item.language}/revisions`}>查看历史</Link>
            <SetDefaultButton
              articleId={articleId}
              language={item.language}
              defaultLanguage={defaultLanguage}
            />
          </>
        )}
      />
      <LocaleModal
        show={show}
        hiddenLocales={existLanguages}
        onOk={(locale) => navigate(`${locale}/new`)}
        onCancel={() => setShow(false)}
      />
    </>
  );
};

const CategoryList: FC<{ categories: CategorySchema[] }> = ({ categories }) => {
  const getCategoryPath = useGetCategoryPath();
  return (
    <>
      {categories.map((category) => (
        <CategoryPath
          key={category.id}
          className="mr-1 inline-block"
          path={getCategoryPath(category.id)}
        />
      ))}
    </>
  );
};

export const ArticleDetail: FC = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: article, isLoading } = useArticle(id!);

  const { mutate: update, isLoading: isUpdating } = useUpdateArticle({
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries('articles');
      queryClient.invalidateQueries(['article', id]);
      navigate('..');
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(`更新失败：${error.message}`);
    },
  });

  const { data: relatedCategories } = useRelatedCategories(id!);

  if (isLoading) {
    return <div className="h-80 my-40 text-center" children={<Spin />} />;
  }

  return (
    <div className="p-10 h-full">
      <div className="mb-4">
        <Breadcrumb className="grow">
          <Breadcrumb.Item>
            <Link to="../..">文章</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item className="text-gray-300">{article?.id}</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <EditArticleForm
        initData={article}
        onSubmit={(data) => update({ id: id!, ...data })}
        onCancel={() => navigate('../..')}
        submitting={isLoading || isUpdating}
      >
        {!!relatedCategories?.length && (
          <div className="mb-4 p-4 bg-gray-50">
            正在使用该文章的分类： <CategoryList categories={relatedCategories} />
          </div>
        )}
        <ArticleTranslationList articleId={id!} defaultLanguage={article?.defaultLanguage} />
      </EditArticleForm>
    </div>
  );
};
