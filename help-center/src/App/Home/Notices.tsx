import { Carousel } from 'antd';
import { useRootCategory } from '@/states/root-category';
import { Link } from 'react-router-dom';
import { AiFillSound } from 'react-icons/ai';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { useNotices } from '@/api/category';
export default function Notices() {
  const rootCategory = useRootCategory();
  const { data: notices } = useNotices(rootCategory.id);

  if (!notices || !notices.length) {
    return null;
  }

  return (
    <div className="mb-2 bg-white rounded">
      <Carousel dotPosition="right" autoplay>
        {notices.map((notice) => (
          <div key={notice.id}>
            <Link to={`/article/${notice.id}`} className="flex items-center px-4 py-2 ">
              <AiFillSound className="shrink-0" />
              <span className="truncate ml-2 mr-1 text-[16px]">{notice.title}</span>
              <FaExternalLinkAlt className="shrink-0 text-sm" />
            </Link>
          </div>
        ))}
      </Carousel>
    </div>
  );
}
