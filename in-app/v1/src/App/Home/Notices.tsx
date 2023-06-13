import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useRootCategory } from '@/states/root-category';
import { NoticeLink } from '@/App/Articles/utils';
import { PageContent } from '@/components/Page';
import SpeakerIcon from '@/icons/Speaker';
import { ChevronRightIcon } from '@heroicons/react/solid';
import { useNotices } from '@/api/category';

export default function Notices() {
  const rootCategory = useRootCategory();
  const { data: notices } = useNotices(rootCategory.id);
  const [emblaRef] = useEmblaCarousel({ axis: 'y', loop: true }, [
    Autoplay({ delay: 3000, stopOnInteraction: false }),
  ]);

  if (!notices || !notices.length) {
    return null;
  }
  return (
    <PageContent shadow padding={false} className="mb-2">
      <div className="overflow-hidden " ref={emblaRef}>
        <div className="flex flex-col h-[45px] items-stretch">
          {notices.map((notice) => (
            <NoticeLink
              article={notice}
              key={notice.id}
              className="flex items-center text-tapBlue px-4 py-3"
            >
              <SpeakerIcon className="text-tapBlue shrink-0" />
              <span className="grow truncate ml-2 mr-1">{notice.title}</span>
              <ChevronRightIcon className="shrink-0 h-4 w-4 text-tapBlue" />
            </NoticeLink>
          ))}
        </div>
      </div>
    </PageContent>
  );
}
