import { ReactNode, useMemo } from 'react';
import { AiOutlinePaperClip } from 'react-icons/ai';
import moment from 'moment';
import { partition } from 'lodash-es';
import cx from 'classnames';

import { Image, Skeleton } from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import { useTicketContext } from '../TicketContext';
import { useTimeline } from './useTimeline';
import { OpsLog } from './OpsLog';
import styles from './index.module.css';

const IMAGE_FILE_MIMES = ['image/png', 'image/jpeg', 'image/gif'];

export function Timeline() {
  const { ticket } = useTicketContext();

  const { data: timeline, isLoading } = useTimeline(ticket.id);

  return (
    <div className={styles.timeline}>
      <ReplyCard
        author={ticket.author ? <UserLabel user={ticket.author} /> : 'unknown'}
        createTime={ticket.createdAt}
        content={ticket.contentSafeHTML}
        files={ticket.files}
      />
      {isLoading && <Skeleton active paragraph={{ rows: 4 }} />}
      {timeline.map((timeline) => {
        if (timeline.type === 'reply') {
          return (
            <ReplyCard
              key={timeline.data.id}
              author={<UserLabel user={timeline.data.author} />}
              createTime={timeline.data.createdAt}
              content={timeline.data.contentSafeHTML}
              files={timeline.data.files}
              isAgent={timeline.data.isCustomerService}
              isInternal={timeline.data.internal}
            />
          );
        } else {
          return <OpsLog key={timeline.data.id} data={timeline.data} />;
        }
      })}
    </div>
  );
}

interface FileInfo {
  id: string;
  name: string;
  mime: string;
  url: string;
}

interface ReplyCardProps {
  author: ReactNode;
  createTime: string;
  content: string;
  files?: FileInfo[];
  isAgent?: boolean;
  isInternal?: boolean;
}

function ReplyCard({ author, createTime, content, files, isAgent, isInternal }: ReplyCardProps) {
  const [imageFiles, otherFiles] = useMemo(() => {
    if (!files) {
      return [[], []];
    }
    return partition(files, (file) => IMAGE_FILE_MIMES.includes(file.mime));
  }, [files]);

  return (
    <div
      className={cx('border rounded mb-5 bg-white overflow-hidden', {
        'border-[#00000020]': !isAgent,
        'border-primary-600': isAgent,
        'border-[#ff9800bf]': isInternal,
      })}
    >
      <div
        className={cx('flex items-center gap-1 leading-6 px-[15px] py-[10px] border-b', {
          'bg-[#00000008] border-[#00000020]': !isAgent,
          'bg-primary-400 border-primary-600': isAgent,
          'bg-[#ffc10733] border-[#ff9800bf]': isInternal,
        })}
      >
        {author}
        <span>提交于</span>
        <span title={createTime}>{moment(createTime).fromNow()}</span>
        <div className="grow" />
        {isAgent && <ReplyTag content="客服" isInternal={isInternal} />}
        {isInternal && <ReplyTag content="内部" isInternal />}
      </div>
      <div className="p-[15px]">
        <ReplyContent htmlContent={content} />
        {imageFiles.length > 0 && (
          <>
            <hr className="my-4" />
            <div className="flex flex-wrap gap-2">
              <Image.PreviewGroup>
                {imageFiles.map(({ id, name, url }) => (
                  <Image
                    key={id}
                    className="object-contain"
                    src={url}
                    title={name}
                    width={80}
                    height={80}
                  />
                ))}
              </Image.PreviewGroup>
            </div>
          </>
        )}
      </div>
      {otherFiles.length > 0 && (
        <div className="bg-[#00000008] px-[15px] py-[10px] border-t border-[#00000020]">
          {otherFiles.map(({ id, name, url }) => (
            <a key={id} className="flex items-center" href={url} target="_blank">
              <AiOutlinePaperClip className="inline-block w-4 h-4 mr-1" /> {name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

interface ReplyTagProps {
  content: string;
  isInternal?: boolean;
}

function ReplyTag({ content, isInternal }: ReplyTagProps) {
  return (
    <span
      className={cx('border rounded leading-3 px-1.5 py-1 text-sm text-primary', {
        'border-primary': !isInternal,
        'border-[#ff9800bf] text-[#ff9800bf]': isInternal,
      })}
    >
      {content}
    </span>
  );
}

interface ReplyContentProps {
  htmlContent?: string;
}

function ReplyContent({ htmlContent }: ReplyContentProps) {
  if (!htmlContent) {
    return (
      <div className="text-gray-500">
        <em>未提供描述。</em>
      </div>
    );
  }
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
