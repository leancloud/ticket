import { FC, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { useCategoryTopics } from '@/api/category';
import { QueryWrapper } from '@/components/QueryWrapper';
import { ArticleListItem } from '@/App/Articles/utils';
import { useAppState } from '@/App/context';
import classNames from 'classnames';
import styles from './index.module.css';

const Topics: FC<{}> = () => {
  const result = useCategoryTopics();
  const { data } = result;
  const [{ topicIndex }, { update }] = useAppState();

  return (
    <QueryWrapper result={result}>
      <div>
        <Tab.Group selectedIndex={topicIndex} onChange={(topicIndex) => update({ topicIndex })}>
          <Tab.List className="flex overflow-x-auto mt-[14px] mb-3">
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
                  <ArticleListItem
                    key={item.id}
                    article={item}
                    className="!h-[42px] text-[#666] text-[13px]"
                  />
                ))}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </QueryWrapper>
  );
};

export default Topics;
