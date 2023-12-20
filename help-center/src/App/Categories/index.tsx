import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRootCategory } from '@/states/root-category';
import { Cascader, Collapse, Button } from '@/components/antd';
import { intlFormat } from 'date-fns';
import { Loading } from '@/components/Loading';
import { NoData } from '@/components/NoData';
import FillIcon from '@/icons/Fill';
import _ from 'lodash-es';
import { Category, useCategories, useFAQs } from '@/api/category';
import { useArticle } from '@/api/article';
import styles from './index.module.css';
import { NewTicketModal } from './NewTicket';

type Option = Category & {
  children?: Option[];
};

function useOptions(categories: Category[] | undefined, rootCategoryId: string) {
  if (!categories) {
    return [];
  }

  categories = _.cloneDeep(categories);

  const results: Option[] = categories.filter((item) => item.parentId === rootCategoryId);

  const itemById: Record<string, Option> = _.keyBy(categories, 'id');

  for (let i = 0; i < categories.length; i++) {
    const element = categories[i];
    const { parentId } = element;
    if (parentId && parentId !== rootCategoryId) {
      const parent = itemById[parentId];

      if (parent.children) {
        parent.children.push(element);
      } else {
        parent.children = [element];
      }
    }
  }
  return results;
}

export default function Categories() {
  const navigate = useNavigate();
  const [t, i18n] = useTranslation();
  const { id } = useParams();
  const rootCategory = useRootCategory();
  const result = useCategories();
  const { data: categories, isLoading: categoriesIsLoading, error } = result;
  const options = useOptions(categories, rootCategory.id);
  const [faqId, setFaqId] = useState('');
  const [value, setValue] = useState<string[] | undefined>([]);
  const categoryId = value && value[value.length - 1];
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!categories) {
      return;
    }
    const value: string[] = [];
    let key: string | undefined = id;
    while (key && categories) {
      const curr = categories.find((item) => item.id === key);
      if (!curr) {
        key = undefined;
        break;
      }
      value.unshift(curr.id);
      key = curr.parentId;
    }
    setValue(value);
  }, [id, categories]);

  const currentCategory = useMemo(() => {
    return categories?.find((item) => item.id === categoryId);
  }, [categories, categoryId]);

  const { data: article, isLoading: ArticleIsLoading } = useArticle(currentCategory?.articleId!, {
    enabled: !!currentCategory?.articleId,
  });

  const { data: faqs, isLoading: FAQsIsLoading } = useFAQs(currentCategory?.id, {
    enabled: !!currentCategory?.id,
  });

  const { data: faqDetail, isLoading: FaqDetailLoading } = useArticle(faqId, {
    enabled: !!faqId,
  });

  useEffect(() => {
    setFaqId('');
  }, [categoryId]);

  useEffect(() => {
    if (!article && faqs?.[0]) {
      setFaqId(faqs[0].id);
    }
  }, [article, faqs]);

  const isLoadingDetail = ArticleIsLoading || FAQsIsLoading;

  const isTicketEnabled = currentCategory?.isTicketEnabled;
  const ticketDescription = currentCategory?.ticketDescription || rootCategory.ticketDescription;
  const noData = categories?.length === 0 && faqs?.length === 0;

  return (
    <div className="content">
      <div>
        <div className="mb-3 text-xl text-center">{t('ticket.select')}</div>
        <Cascader
          className="!block !mx-[auto] !w-[80%] md:!w-[40%] "
          loading={categoriesIsLoading}
          fieldNames={{ label: 'name', value: 'id' }}
          options={options}
          onChange={(data) => {
            const id = data ? data[data.length - 1] : undefined;
            navigate(id ? `/categories/${id}` : '/categories', { replace: true });
          }}
          value={value}
        />
      </div>
      {isLoadingDetail && <Loading />}
      {noData && (
        <div className="mt-8">
          <NoData message={t('ticket.no_solutions')} />
        </div>
      )}
      {currentCategory && !isLoadingDetail && (
        <div className="mt-8 mx-[auto] md:w-[60%]">
          <div className="text-lg text-center mt-6 mb-2">{t('ticket.solutions')}</div>
          {article && (
            <>
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: article.contentSafeHTML }}
              />
              <p className="pt-1 text-gray-400">
                {`${t('general.update_at')}: ${intlFormat(new Date(article.updatedAt), {
                  // @ts-ignore https://github.com/date-fns/date-fns/issues/3424
                  locale: i18n.language,
                })}`}
              </p>
            </>
          )}
          {!!faqs?.length && (
            <div className="mt-8">
              <div className="text-[16px] mb-2">{t('ticket.faqs')}</div>
              <Collapse
                className={styles.collapse}
                accordion
                activeKey={faqId}
                onChange={(id) => {
                  setFaqId(id as string);
                }}
              >
                {faqs.map((item) => (
                  <Collapse.Panel key={item.id} header={<div>{item.title}</div>}>
                    {FaqDetailLoading && <Loading />}
                    {faqDetail && (
                      <div
                        className="markdown-body text-base"
                        dangerouslySetInnerHTML={{ __html: faqDetail.contentSafeHTML }}
                      />
                    )}
                  </Collapse.Panel>
                ))}
              </Collapse>
            </div>
          )}
          {isTicketEnabled && (
            <div className="mt-4 bg-background rounded-lg py-4 px-4">
              <div className="text-center text-[16px] text-[#909090] mb-4">{t('help.title')}</div>
              <div className="flex justify-center gap-x-4">
                <div
                  onClick={() => setShowForm(true)}
                  className="flex items-center px-3 py-2 border rounded-lg cursor-pointer bg-white"
                >
                  <div className="w-[18px]">
                    <FillIcon />
                  </div>
                  <div className="ml-4">
                    <div className="text-[16px]">{t('help.submit_ticket')}</div>
                    {ticketDescription && (
                      <div className="text-[#888] break-all">{ticketDescription}</div>
                    )}
                  </div>
                </div>
                {/* <div className="flex items-center px-4 py-2 border rounded-lg cursor-pointer bg-white">
                  <div className="w-[18px]">
                    <FillIcon />
                  </div>
                  <div className="ml-4">
                    <div className="text-[16px]">{t('help.chat')}</div>
                    <div className="text-[#888] break-all">暂不支持</div>
                  </div>
                </div> */}
              </div>
            </div>
          )}
        </div>
      )}
      {showForm && currentCategory && (
        <NewTicketModal
          category={currentCategory}
          open={showForm}
          close={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
