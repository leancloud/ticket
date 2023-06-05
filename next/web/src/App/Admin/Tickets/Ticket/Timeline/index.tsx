import { ReactNode, useMemo } from 'react';
import { AiOutlinePaperClip } from 'react-icons/ai';
import moment from 'moment';
import { partition } from 'lodash-es';
import cx from 'classnames';

import { useTicketReplies } from '@/api/ticket';
import { Image, Skeleton } from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import { useTicketContext } from '../TicketContext';
import styles from './index.module.css';

const IMAGE_FILE_MIMES = ['image/png', 'image/jpeg', 'image/gif'];

export function Timeline() {
  const { ticket } = useTicketContext();

  const { data: replies, isLoading: loadingReplies } = useTicketReplies(ticket.id);

  const replyItems = useMemo(() => {
    if (!replies) {
      return [];
    }
    return replies.pages.flat();
  }, [replies]);

  return (
    <div className={replies ? styles.timeline : undefined}>
      <ReplyCard
        author={ticket.author ? <UserLabel user={ticket.author} /> : 'unknown'}
        createTime={ticket.createdAt}
        content={ticket.contentSafeHTML}
        files={ticket.files}
      />
      {loadingReplies && <Skeleton active paragraph={{ rows: 4 }} />}
      {replyItems.map((reply) => (
        <ReplyCard
          key={reply.id}
          author={<UserLabel user={reply.author} />}
          createTime={reply.createdAt}
          content={reply.contentSafeHTML}
          files={reply.files}
          isAgent={reply.isCustomerService}
        />
      ))}
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
}

function ReplyCard({ author, createTime, content, files, isAgent }: ReplyCardProps) {
  const [imageFiles, otherFiles] = useMemo(() => {
    if (!files) {
      return [[], []];
    }
    return partition(files, (file) => IMAGE_FILE_MIMES.includes(file.mime));
  }, [files]);

  return (
    <div
      className={cx('border rounded-[3px] mb-5 bg-white', {
        'border-[#00000020]': !isAgent,
        'border-primary-600': isAgent,
      })}
    >
      <div
        className={cx('flex items-center gap-1 leading-6 px-[15px] py-[10px] border-b', {
          'bg-[#00000008] border-[#00000020]': !isAgent,
          'bg-primary-400 border-primary-600': isAgent,
        })}
      >
        {author}
        <span>提交于</span>
        <span title={createTime}>{moment(createTime).fromNow()}</span>
        {isAgent && (
          <>
            <div className="grow" />
            <span className="border border-primary rounded px-1 text-sm text-primary">客服</span>
          </>
        )}
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
