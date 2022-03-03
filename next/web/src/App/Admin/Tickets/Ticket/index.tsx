import { ComponentPropsWithoutRef, ReactNode, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  AiOutlineHistory,
  AiOutlineUser,
  AiOutlineSmile,
  AiOutlineFrown,
  AiOutlineFile,
} from 'react-icons/ai';
import cx from 'classnames';
import moment from 'moment';

import { useTicket, useTicketReplies } from '@/api/ticket';
import { UserSchema } from '@/api/user';
import { FileSchema } from '@/api/file';

function IconButton(props: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      {...props}
      className={cx(
        'w-8 h-8 flex justify-center items-center text-[#68737d] hover:bg-[#1f73b714] rounded transition-colors duration-200',
        props.className
      )}
    >
      {props.children}
    </button>
  );
}

function FileBlock({ file }: { file: FileSchema }) {
  const { name: filename, mime } = file;
  const ext = useMemo(() => {
    if (filename) {
      const lastDotIndex = filename.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        return filename.slice(lastDotIndex + 1).toUpperCase();
      }
    }
  }, [filename]);
  const isImage = useMemo(() => mime.toLowerCase().startsWith('image'), [mime]);

  return (
    <a
      className="w-[136px] rounded overflow-hidden border border-gray-300 hover:border-primary"
      href={file.url}
      target="_blank"
    >
      <div className="h-[68px] flex">
        {isImage ? (
          <img className="h-full w-full object-cover" src={file.url} />
        ) : (
          <AiOutlineFile className="w-6 h-6 m-auto" />
        )}
      </div>
      <div className="h-[48px] p-2 text-sm leading-4 bg-[#e9ebed] flex flex-col justify-center">
        <div className="truncate text-[#49545c]" title={file.name}>
          {file.name}
        </div>
        {ext && <div className="text-[#68737d]">{ext}</div>}
      </div>
    </a>
  );
}

interface ReplyContentProps {
  author: UserSchema;
  createdAt?: string;
  content: ReactNode;
  files?: FileSchema[];
}

function ReplyContent({ author, createdAt, content, files }: ReplyContentProps) {
  return (
    <div className="flex px-5 py-4">
      <div className="shrink-0">
        <img className="rounded-full" src={author.avatarUrl} width={40} height={40} />
      </div>

      <div className="grow ml-4 overflow-hidden">
        <div className="flex">
          <div className="grow text-[#2f3941] font-semibold mr-2 truncate">{author.username}</div>
          {createdAt && (
            <div
              className="shrink-0 text-sm text-[#68737d] leading-[22px]"
              title={moment(createdAt).format('YYYY-MM-DD HH:mm:ss')}
            >
              {moment(createdAt).fromNow()}
            </div>
          )}
        </div>

        <div className="mt-2">{content}</div>

        {files && files.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {files.map((file) => (
              <FileBlock file={file} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Evaluation({ star, content }: { star: number; content: string }) {
  const Icon = star ? AiOutlineSmile : AiOutlineFrown;

  return (
    <div
      className={cx('p-4 rounded', {
        'bg-green-100': star,
        'bg-red-50': !star,
      })}
    >
      <div className="text-sm flex items-center">
        评价工单：
        <Icon className="inline-block w-4 h-4" />
      </div>
      <div className="mt-2">{content}</div>
    </div>
  );
}

export function Ticket() {
  const { id } = useParams<'id'>();

  const { data: ticket } = useTicket(id!, {
    include: ['author', 'files'],
  });

  const { data: replyPages } = useTicketReplies(id!);
  const replies = useMemo(() => replyPages?.pages.flat(), [replyPages]);

  if (!ticket) {
    return null;
  }

  return (
    <div className="h-full flex">
      <div className="w-[308px] shrink-0 bg-[#f8f9f9] border-r border-[#d8dcde]">
        {/* Attributes */}
      </div>

      <div className="flex flex-col grow bg-white overflow-hidden">
        <div className="flex grow overflow-hidden">
          <div className="flex flex-col grow overflow-hidden">
            <div className="h-12 flex shrink-0 items-center border-b border-[#d8dcde] px-5">
              <div className="grow overflow-hidden">
                <div className="text-[16px] text-[#2f3941] truncate" title={ticket.title}>
                  {ticket.title}
                </div>
              </div>

              <div className="shrink-0">
                <IconButton>
                  <AiOutlineHistory className="w-[18px] h-[18px]" />
                </IconButton>
              </div>
            </div>

            <div className="grow overflow-auto">
              <ReplyContent
                author={ticket.author!}
                createdAt={ticket.createdAt}
                content={
                  <div
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: ticket.contentSafeHTML }}
                  />
                }
                files={ticket.files}
              />

              {replies?.map((reply) => (
                <ReplyContent
                  author={reply.author}
                  createdAt={reply.createdAt}
                  content={
                    <div
                      className="markdown-body"
                      dangerouslySetInnerHTML={{ __html: reply.contentSafeHTML }}
                    />
                  }
                />
              ))}

              {ticket.evaluation && (
                <ReplyContent
                  author={ticket.author!}
                  content={<Evaluation {...ticket.evaluation} />}
                />
              )}
            </div>

            <div className="h-[142px] shrink-0 border-t border-[#d8dcde]">{/* Reply input */}</div>
          </div>

          <div className="w-12 p-2 shrink-0 border-l border-[#d8dcde]">
            <IconButton>
              <AiOutlineUser className="w-[18px] h-[18px]" />
            </IconButton>
          </div>
        </div>

        <div className="h-[50px] shrink-0 border-t border-[#d8dcde]">{/* Send buttons */}</div>
      </div>
    </div>
  );
}
