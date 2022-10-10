import { FC, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { useCategoryTopics } from '@/api/category';
import { QueryWrapper } from '@/components/QueryWrapper';
import { ArticleListItem } from '@/App/Articles/utils';
import { useAppState } from '@/App/context';
import classNames from 'classnames';
import styles from './index.module.css';

const Feedback: FC = () => {
  return (
    <div className="my-[20px] text-center">
      <p className="mb-2 text-sm text-[#666] leading-[16px]">若以上内容没有帮助到你</p>

      <Link
        className="inline-block py-[7px] px-[36px] text-[14px] text-tapBlue leading-[22px] font-bold border rounded-full"
        to="/topCategories"
      >
        提交反馈
      </Link>
    </div>
  );
};

const Topics: FC<{}> = () => {
  const result = useCategoryTopics();
  const { data } = result;
  const [{ topicIndex }, { update }] = useAppState();

  return (
    <QueryWrapper result={result}>
      <div>
        <Tab.Group selectedIndex={topicIndex} onChange={(topicIndex) => update({ topicIndex })}>
          <Tab.List className="flex px-4 py-3 overflow-x-auto">
            {data?.map((item) => (
              <Tab as={Fragment} key={item.id}>
                {({ selected }) => (
                  <button
                    data-text={item.name}
                    className={classNames(
                      selected ? 'bg-tapBlue text-white font-bold' : 'bg-[#F5F7F8] text-[#868C92]',
                      styles.topicItem
                    )}
                  >
                    {item.name}
                  </button>
                )}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels>
            {data?.map(({ id, articles }) => (
              <Tab.Panel key={id}>
                {articles.map((item) => (
                  <ArticleListItem key={item.id} article={item} className="!h-[42px]" />
                ))}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
      <Feedback />
    </QueryWrapper>
  );
};

export default Topics;
