import { FC } from 'react';
import { Tab } from '@headlessui/react';
import { useCategoryTopics } from '@/api/category';
import { useRootCategory } from '@/App';
import { QueryWrapper } from '@/components/QueryWrapper';
import { ArticleListItem } from '@/App/Articles/utils';

const Topics: FC = () => {
  const rootCategoryId = useRootCategory();
  const result = useCategoryTopics(rootCategoryId);
  const { data } = result;

  return (
    <div className="mt-2">
      <QueryWrapper result={result}>
        <h2 className="grow px-4 font-bold">常见问题</h2>
        <Tab.Group>
          <Tab.List className="flex mt-1 px-4 overflow-x-auto">
            {data?.map((item) => (
              <Tab
                key={item.id}
                className={({ selected }) =>
                  `rounded mr-2 whitespace-nowrap focus:outline-none px-2 py-1 ${
                    selected ? 'bg-tapBlue text-white' : 'bg-[#eee] text-[#666]'
                  }`
                }
              >
                {item.name}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels>
            {data?.map(({ id, articles }) => (
              <Tab.Panel key={id}>
                {articles.map((item) => (
                  <ArticleListItem key={item.id} article={item} className="px-0" />
                ))}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </QueryWrapper>
    </div>
  );
};

export default Topics;
