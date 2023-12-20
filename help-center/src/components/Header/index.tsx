import { useState, useEffect, useMemo, useRef } from 'react';
import { useRootCategory } from '@/states/root-category';
import { Link, useNavigate, useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiLightBulb } from 'react-icons/hi';
import { AiOutlineUser } from 'react-icons/ai';
import { Select, Spin, Dropdown } from '@/components/antd';
import type { SelectProps } from 'antd/es/select';
import { debounce, keyBy } from 'lodash-es';
import { NoData } from '@/components/NoData';
import { useCategories, classifyTicket } from '@/api/category';
import { useHasUnreadTickets } from '@/api/ticket';
import classNames from 'classnames';
import { useAuth } from '@/states/auth';

function Search() {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState<SelectProps['options']>([]);
  const rootCategory = useRootCategory();
  const enableAIClassify = rootCategory.meta?.enableAIClassify;
  const { data: categories, isLoading } = useCategories();
  const fetchRef = useRef<string>();

  const leafCategories = useMemo(() => {
    if (!categories) {
      return [];
    }
    const obj = keyBy(categories, 'parentId');

    return categories.filter((item) => !obj[item.id]);
  }, [categories]);

  const buildOptions = async (keyword: string) => {
    const aiOptions: SelectProps['options'] = [];
    const matchOptions: SelectProps['options'] = [];

    const emptyOption = { label: t('categories.empty'), disabled: true };

    if (enableAIClassify && keyword) {
      const aiResult = await classifyTicket(rootCategory.id, keyword);
      if (aiResult.status === 'success') {
        aiOptions.push({ label: aiResult.data.name, value: aiResult.data.id });
      } else {
        aiOptions.push(emptyOption);
      }
    }

    if (categories) {
      const matchs = leafCategories.filter((item) => item.name.includes(keyword));
      if (matchs.length) {
        matchOptions.push(...matchs.map((item) => ({ label: item.name, value: item.id })));
      } else {
        matchOptions.push(emptyOption);
      }
    }
    return aiOptions.length
      ? [
          { label: t('categories.AI'), options: aiOptions },
          { label: t('categories.relative'), options: matchOptions },
        ]
      : matchOptions;
  };

  const search = useMemo(() => {
    const loadOptions = (value: string) => {
      fetchRef.current = value;
      const fetchKey = fetchRef.current;
      setOptions([]);
      setFetching(true);

      buildOptions(value).then((newOptions) => {
        if (fetchKey !== fetchRef.current) {
          return;
        }

        setOptions(newOptions);
        setFetching(false);
      });
    };

    return debounce(loadOptions, 500);
  }, [buildOptions]);

  useEffect(() => {
    search('');
  }, [categories]);

  return (
    <Select
      loading={isLoading}
      showArrow={false}
      showSearch
      filterOption={false}
      className="!block !mx-[auto] !w-[50%] rounded-lg"
      onSearch={search}
      notFoundContent={fetching ? <Spin size="small" /> : <NoData />}
      options={options}
      onSelect={(v) => {
        navigate(`/categories/${v}`);
      }}
    />
  );
}

export function Header() {
  const [t] = useTranslation();
  const rootCategory = useRootCategory();
  const isCategories = useMatch('/categories/*');
  const isTickets = useMatch('/tickets/*');
  const hideSearch = !!(isCategories || isTickets);
  const { user } = useAuth();
  const { data: hasUnreadTickets } = useHasUnreadTickets(rootCategory.id);

  return (
    <div className={classNames('bg-white', hideSearch && '!bg-primary text-white')}>
      <div className="content flex justify-between items-center">
        <Link
          className={classNames(
            'flex items-center text-3xl font-bold',
            hideSearch && 'text-white hover:text-white'
          )}
          to="/"
        >
          <HiLightBulb className="mr-1" />
          {rootCategory.name}
        </Link>
        <div>
          {!user && (
            <Link className="text-neutral" to="">
              {t('auth.login')}
            </Link>
          )}
          {user && (
            <Dropdown
              placement="bottom"
              menu={{
                items: [
                  {
                    key: 'tickets',
                    label: <Link to="/tickets">{t('feedback.record')}</Link>,
                  },
                ],
              }}
            >
              <div
                className={classNames(
                  'bg-primary rounded-full cursor-pointer w-[40px] h-[40px] flex justify-center items-center relative text-white',
                  hideSearch && 'bg-white !text-primary'
                )}
              >
                <AiOutlineUser className="text-[24px]" />
                {hasUnreadTickets && (
                  <div className="w-[10px] h-[10px] rounded-full absolute top-0 right-0 bg-danger border border-white" />
                )}
              </div>
            </Dropdown>
          )}
        </div>
      </div>
      {!hideSearch && (
        <div className="bg-primary text-white pt-[50px] pb-[80px]">
          <p className="mb-4 block mx-[auto] text-2xl text-center">{t('help.search')}</p>
          <Search />
        </div>
      )}
    </div>
  );
}
