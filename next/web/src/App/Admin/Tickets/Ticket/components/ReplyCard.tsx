import { forwardRef, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AiOutlinePaperClip } from 'react-icons/ai';
import { BsThreeDots } from 'react-icons/bs';
import { useToggle } from 'react-use';
import { Dropdown, Image, MenuProps } from 'antd';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import { partition } from 'lodash-es';
import cx from 'classnames';

import { Time } from './Time';
import { useTranslation_v1 } from '../api1';

const IMAGE_FILE_MIMES = ['image/png', 'image/jpeg', 'image/gif'];

interface FileInfo {
  id: string;
  name: string;
  mime: string;
  url: string;
}

export interface BasicReplyCardProps {
  id?: string;
  className?: string;
  type?: 'primary' | 'internal';
  title?: ReactNode;
  tags?: string[];
  menu?: MenuProps;
  children?: ReactNode;
  files?: FileInfo[];
  active?: boolean;
  deleted?: boolean;
  collapsed?: boolean;
}

export const BasicReplyCard = forwardRef<HTMLDivElement, BasicReplyCardProps>(
  (
    { id, className, type, title, tags, menu, children, files, active, deleted, collapsed },
    ref
  ) => {
    const [imageFiles, otherFiles] = useMemo(() => {
      if (!files) {
        return [[], []];
      }
      return partition(files, (file) => IMAGE_FILE_MIMES.includes(file.mime));
    }, [files]);

    return (
      <div
        ref={ref}
        id={id}
        className={cx('bg-white border border-[#00000020] rounded overflow-hidden', className, {
          'border-dashed': deleted,
          'border-primary-600': type === 'primary',
          'border-[#ff9800bf]': type === 'internal',
          'outline outline-blue-500 border-blue-500': active,
        })}
      >
        <div
          className={cx(
            'flex items-center leading-6 px-[15px] py-[10px]',
            'bg-[#00000008] border-[#00000020]',
            {
              'border-b': !collapsed,
              'border-dashed': deleted,
              'bg-primary-400 border-primary-600': type === 'primary',
              'bg-[#ffc10733] border-[#ff9800bf]': type === 'internal',
            }
          )}
        >
          <div className="grow">{title}</div>
          {tags?.map((tag) => (
            <span
              key={tag}
              className={cx('ml-1 border rounded leading-3 px-1.5 py-1 text-sm whitespace-nowrap', {
                'border-primary text-primary': type === 'primary',
                'border-[#ff9800bf] text-[#ff9800bf]': type === 'internal',
              })}
            >
              {tag}
            </span>
          ))}
          {menu && (
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={menu}
              getPopupContainer={() => document.getElementById('ticket_container')!}
            >
              <button className="ml-2">
                <BsThreeDots className="w-4 h-4" />
              </button>
            </Dropdown>
          )}
        </div>
        {!collapsed && (
          <div className="p-[15px]">
            {children}
            {imageFiles.length > 0 && (
              <>
                <hr className="my-4" />
                <ImageFiles files={imageFiles} />
              </>
            )}
          </div>
        )}
        {!collapsed && otherFiles.length > 0 && (
          <div className="flex flex-col items-start gap-1 bg-[#00000008] p-[10px] border-t border-[#00000020]">
            {otherFiles.map(({ id, name, url }) => (
              <a
                key={id}
                className="grid grid-cols-[16px_1fr] items-center"
                href={url}
                target="_blank"
              >
                <AiOutlinePaperClip className="w-4 h-4" />
                <span className="ml-1 truncate" title={name}>
                  {name}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }
);

interface ReplyCardProps {
  id: string;
  author: ReactNode;
  createTime: string;
  content: string;
  files?: FileInfo[];
  isAgent?: boolean;
  isInternal?: boolean;
  edited?: boolean;
  deleted?: boolean;
  onClickMenu?: (key: string) => void;
}

export function ReplyCard({
  id,
  author,
  createTime,
  content,
  files,
  isAgent,
  isInternal,
  edited,
  deleted,
  onClickMenu,
}: ReplyCardProps) {
  const [translation, toggleTranslation] = useToggle(false);

  const menuItems = useMemo(() => {
    const items: ItemType[] = [
      { label: '复制链接', key: 'copyLink' },
      { label: '翻译', key: 'translate' },
    ];
    if (isAgent) {
      if (!deleted) {
        items.push({ type: 'divider' }, { label: '编辑', key: 'edit' });
        if (edited) {
          items.push({ label: '修改记录', key: 'revisions' });
        }
        items.push({ type: 'divider' }, { label: '删除', key: 'delete', danger: true });
      } else if (edited) {
        items.push({ label: '修改记录', key: 'revisions' });
      }
    }
    return items;
  }, [isAgent, edited, deleted]);

  const handleClickMenu = ({ key }: { key: string }) => {
    if (key === 'translate') {
      toggleTranslation();
    } else if (key === 'copyLink') {
      navigator.clipboard.writeText(createLink(id));
    } else {
      onClickMenu?.(key);
    }
  };

  const tags = useMemo(() => {
    const tags: string[] = [];
    if (isAgent) {
      tags.push('客服');
    }
    if (isInternal) {
      tags.push('内部');
    }
    return tags;
  }, [isAgent, isInternal]);

  const { ref, active } = useAutoScrollIntoView(id);

  const [collapsed, setCollapsed] = useState(active ? false : deleted);

  return (
    <BasicReplyCard
      ref={ref}
      id={id}
      type={isInternal ? 'internal' : isAgent ? 'primary' : undefined}
      title={
        <div className="flex flex-wrap items-center gap-1">
          {collapsed ? (
            <>
              <span>已删除</span>
              <TextButton text="展开" onClick={() => setCollapsed(false)} />
            </>
          ) : (
            <>
              {author}
              <span>提交于</span>
              <Time value={createTime} />
              {edited && <TextButton text="编辑过" onClick={() => onClickMenu?.('revisions')} />}
              {deleted && <TextButton text="收起" onClick={() => setCollapsed(true)} />}
            </>
          )}
        </div>
      }
      tags={tags}
      menu={collapsed ? undefined : { items: menuItems, onClick: handleClickMenu }}
      files={files}
      active={active}
      deleted={deleted}
      collapsed={collapsed}
    >
      <Translation enabled={translation}>
        <ReplyContent htmlContent={content} />
      </Translation>
    </BasicReplyCard>
  );
}

interface TextButtonProps {
  text: string;
  onClick?: () => void;
}

function TextButton({ text, onClick }: TextButtonProps) {
  return (
    <span>
      (
      <a className="text-inherit" onClick={onClick}>
        {text}
      </a>
      )
    </span>
  );
}

interface ReplyContentProps {
  htmlContent?: string;
}

export function ReplyContent({ htmlContent }: ReplyContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelectorAll('a').forEach((a) => {
      a.target = '_blank';
    });
  }, [htmlContent]);

  if (!htmlContent) {
    return (
      <div className="text-gray-500">
        <em>未提供描述。</em>
      </div>
    );
  }
  return (
    <div ref={ref} className="markdown-body" dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}

interface ImageFilesProps {
  files: FileInfo[];
}

function ImageFiles({ files }: ImageFilesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Image.PreviewGroup>
        {files.map(({ id, name, url }) => (
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
  );
}

function useAutoScrollIntoView(id: string) {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const active = hash === `#${id}`;

  useEffect(() => {
    if (!active || !ref.current) {
      return;
    }

    const el = ref.current;
    el.scrollIntoView({ block: 'center' });

    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Node && !el.contains(e.target)) {
        navigate('.', { replace: true });
        clear();
      }
    };
    const clear = () => {
      document.removeEventListener('click', onClick);
    };

    document.addEventListener('click', onClick);
    return clear;
  });

  return { ref, active };
}

interface TranslationNode {
  node: Node;
  text: string;
}

function getTranslationNodes(root: Node) {
  const queue = [root];
  const nodes: TranslationNode[] = [];
  while (queue.length) {
    const node = queue.shift()!;
    if (node instanceof Element && node.tagName === 'CODE') {
      // 不翻译 code 中的文本
      continue;
    }
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      nodes.push({ node, text: node.textContent });
    }
    node.childNodes.forEach((child) => queue.push(child));
  }
  return nodes;
}

interface TranslationProps {
  children: ReactNode;
  enabled: boolean;
}

function Translation({ children, enabled }: TranslationProps) {
  const container = useRef<HTMLDivElement>(null!);
  const nodes = useRef<TranslationNode[]>([]);
  const [texts, setTexts] = useState<string[]>([]);

  const { data: translations } = useTranslation_v1(texts);

  useEffect(() => {
    if (enabled) {
      nodes.current = getTranslationNodes(container.current);
      setTexts(nodes.current.map((node) => node.text));
    } else {
      nodes.current.forEach(({ node, text }) => (node.textContent = text));
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled && translations) {
      for (const node of nodes.current) {
        const translation = translations[node.text.trim()];
        if (translation) {
          node.node.textContent = translation;
        }
      }
    }
  }, [enabled, translations]);

  return <div ref={container}>{children}</div>;
}

function createLink(hash: string) {
  const url = new URL(location.origin);
  url.pathname = location.pathname;
  url.hash = hash;
  return url.toString();
}
