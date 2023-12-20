import { MdTopic } from 'react-icons/md';
import { CategoryTopics } from '@/api/category';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface TopicsProps {
  data?: CategoryTopics[];
}

export default function Topics({ data }: TopicsProps) {
  const [t] = useTranslation();
  return (
    <div className="mt-6">
      <div className="mb-4 text-center text-2xl leading-[1]">{t('general.topics')}</div>
      <div className="flex flex-wrap justify-center mb-5 w-[100%]">
        {data?.map((item) => (
          <Link
            key={item.id}
            to={`/topic/${item.id}`}
            className={` bg-white text-lg text-neutral hover:text-neutral
            relative w-[40%] p-[16px]
            md:flex-1 md:max-w-[260px] md:min-w-[160px]
          `}
          >
            <div className="rounded pt-[100%] border  duration-200 hover:scale-110 hover:shadow">
              <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-center items-center">
                <MdTopic className="text-[28px] md:text-[42px]" />
                <div className="text-[16px] md:text-[20px] leading-[1] mt-3 truncate">
                  {item.name}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
