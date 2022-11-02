import { ReactNode, useMemo } from 'react';
import { AiOutlinePaperClip } from 'react-icons/ai';
import moment from 'moment';
import { partition } from 'lodash-es';
import { TicketDetailSchema, useTicketReplies } from '@/api/ticket';
import { Image, Skeleton } from '@/components/antd';
import { UserLabel } from '@/App/Admin/components';
import styles from './index.module.css';

const IMAGE_FILE_MIMES = ['image/png', 'image/jpeg', 'image/gif'];

interface TimelineProps {
  ticket: TicketDetailSchema;
}

export function Timeline({ ticket }: TimelineProps) {
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
        author={<UserLabel user={ticket.author!} />}
        createTime={ticket.createdAt}
        content={ticket.contentSafeHTML}
        files={ticket.files}
      />
      {loadingReplies && <Skeleton active paragraph={{ rows: 4 }} />}
      {replyItems.map(({ id, author, createdAt, contentSafeHTML, files }) => (
        <ReplyCard
          key={id}
          author={<UserLabel user={author} />}
          createTime={createdAt}
          content={contentSafeHTML}
          files={files}
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
}

function ReplyCard({ author, createTime, content, files }: ReplyCardProps) {
  const [imageFiles, otherFiles] = useMemo(() => {
    if (!files) {
      return [[], []];
    }
    return partition(files, (file) => IMAGE_FILE_MIMES.includes(file.mime));
  }, [files]);

  return (
    <div className="border border-[#00000020] rounded-[3px] mb-5 bg-white">
      <div className="flex items-center gap-1 bg-[#00000008] leading-6 px-[15px] py-[10px] border-b border-[#00000020]">
        {author}
        <span>提交于</span>
        <span title={createTime}>{moment(createTime).fromNow()}</span>
      </div>
      <div className="p-[15px]">
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: content }} />
        {imageFiles.length > 0 && (
          <>
            <hr className="my-4" />
            <div className={styles.imageGroup}>
              <Image.PreviewGroup>
                {imageFiles.map(({ id, name, url }) => (
                  <Image key={id} src={url} title={name} />
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
