import { Fragment } from 'react';
import { Tab } from '@headlessui/react';
import classNames from 'classnames';

import { CategoryTopics } from '@/api/category';
import { useAppState } from '@/states/app';
import { NoData } from '@/components/NoData';
import { ArticleListItem } from '@/App/Articles/utils';
import styles from './index.module.css';

interface TopicsProps {
  data?: CategoryTopics[];
}

export default function Topics({ data }: TopicsProps) {
  const [{ topicIndex }, setAppState] = useAppState();

  return (
    <div>
      <Tab.Group
        selectedIndex={topicIndex}
        onChange={(topicIndex) => setAppState((prev) => ({ ...prev, topicIndex }))}
      >
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
              <div className="-mb-3">
                {articles.map((item) => (
                  <ArticleListItem
                    key={item.id}
                    article={item}
                    className="!h-[42px] text-[#666] text-[13px]"
                  />
                ))}
              </div>
              {articles.length === 0 && <NoData />}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
