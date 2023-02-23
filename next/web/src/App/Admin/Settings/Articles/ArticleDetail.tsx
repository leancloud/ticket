import { useArticle, useArticleTranslations, useUpdateArticle } from '@/api/article';
import { Breadcrumb, Button, List, Spin, message } from '@/components/antd';
import { FC, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FeedbackSummary } from './FeedbackSummary';
import { EditArticleForm } from './EditArticleForm';
import { LOCALES } from '@/i18n/locales';
import { ArticleStatus } from './components/ArticleStatus';
import { LocaleModal } from '../../components/LocaleModal';
import { ToggleTranslationPrivateButton } from './components/TogglePrivateButton';
import { SetDefaultButton } from './components/SetDefaultButton';

interface TranslationListProps {
  articleId: string;
  defaultLanguage?: string;
}

const TranslationList: FC<TranslationListProps> = ({ articleId, defaultLanguage }) => {
  const { data: translations, isLoading } = useArticleTranslations(articleId);
  const navigate = useNavigate();

  const [show, setShow] = useState(false);

  const existLanguages = useMemo(() => translations?.map(({ language }) => language) ?? [], [
    translations,
  ]);

  return (
    <>
      <List
        header="文章翻译"
        dataSource={translations}
        loading={isLoading}
        footer={
          existLanguages.length < Object.keys(LOCALES).length ? (
            <Button type="text" onClick={() => setShow(true)} block>
              添加翻译
            </Button>
          ) : null
        }
        renderItem={(item) => (
          <List.Item className="flex flex-row justify-between items-center w-full">
            <Link to={item.language}>
              {item.title} - {LOCALES[item.language]}
            </Link>

            <div className="flex flex-row items-center space-x-4">
              <FeedbackSummary revision={item.revision!} />
              <ArticleStatus article={item} />
              <ToggleTranslationPrivateButton
                translation={item}
                disabled={item.language === defaultLanguage}
              />
              <SetDefaultButton
                articleId={articleId}
                language={item.language}
                defaultLanguage={defaultLanguage}
              />
            </div>
          </List.Item>
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
        <TranslationList articleId={id!} defaultLanguage={article?.defaultLanguage} />
      </EditArticleForm>
    </div>
  );
};
