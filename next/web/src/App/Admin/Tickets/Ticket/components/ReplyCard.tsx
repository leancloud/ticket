import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AiOutlinePaperClip } from 'react-icons/ai';
import { BsThreeDots } from 'react-icons/bs';
import { useToggle } from 'react-use';
import { Dropdown, Image } from 'antd';
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

interface ReplyCardProps {
  id: string;
  author: ReactNode;
  createTime: string;
  content: string;
  files?: FileInfo[];
  isAgent?: boolean;
  isInternal?: boolean;
  editable?: boolean;
  edited?: boolean;
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
  editable,
  edited,
  onClickMenu,
}: ReplyCardProps) {
  const [imageFiles, otherFiles] = useMemo(() => {
    if (!files) {
      return [[], []];
    }
    return partition(files, (file) => IMAGE_FILE_MIMES.includes(file.mime));
  }, [files]);

  const { ref, isActive } = useAutoScrollIntoView(id);

  const [translation, toggleTranslation] = useToggle(false);

  const menuItems = useMemo(() => {
    const items: ItemType[] = [
      { label: '复制链接', key: 'copyLink', disabled: true },
      { label: '翻译', key: 'translate' },
    ];
    if (editable) {
      items.push({ type: 'divider' }, { label: '编辑', key: 'edit' });
      if (edited) {
        items.push({ label: '历史', key: 'showRevisions' });
      }
      items.push({ type: 'divider' }, { label: '删除', key: 'delete', danger: true });
    }
    return items;
  }, [editable, edited]);

  const handleClickMenu = ({ key }: { key: string }) => {
    switch (key) {
      case 'translate':
        toggleTranslation();
        break;
      case 'edit':
      case 'showRevisions':
      case 'delete':
        onClickMenu?.(key);
        break;
    }
  };

  return (
    <div
      id={id}
      ref={ref}
      className={cx('border rounded mb-5 bg-white overflow-hidden border-[#00000020]', {
        'border-primary-600': isAgent,
        'border-[#ff9800bf]': isInternal,
        'outline outline-blue-500 border-blue-500': isActive,
      })}
    >
      <div
        className={cx(
          'flex items-center gap-1 leading-6 px-[15px] py-[10px] border-b',
          'bg-[#00000008] border-[#00000020]',
          {
            'bg-primary-400 border-primary-600': isAgent,
            'bg-[#ffc10733] border-[#ff9800bf]': isInternal,
          }
        )}
      >
        {author}
        <span>提交于</span>
        <Time value={createTime} href={`#${id}`} />
        {edited && <span>(编辑过)</span>}

        <div className="grow" />
        {isAgent && <ReplyTag content="客服" isInternal={isInternal} />}
        {isInternal && <ReplyTag content="内部" isInternal />}
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{ items: menuItems, onClick: handleClickMenu }}
          getPopupContainer={() => ref.current!}
        >
          <button className="ml-2">
            <BsThreeDots className="w-4 h-4" />
          </button>
        </Dropdown>
      </div>
      <div className="p-[15px]">
        <Translation enabled={translation}>
          <ReplyContent htmlContent={content} />
        </Translation>
        {imageFiles.length > 0 && (
          <>
            <hr className="my-4" />
            <ImageFiles files={imageFiles} />
          </>
        )}
      </div>
      {otherFiles.length > 0 && <FileList files={otherFiles} />}
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

interface FileListProps {
  className?: string;
  files: FileInfo[];
}

function FileList({ files }: FileListProps) {
  return (
    <div className="bg-[#00000008] px-[15px] py-[10px] border-t border-[#00000020]">
      {files.map(({ id, name, url }) => (
        <a key={id} className="grid grid-cols-[16px_1fr] items-center" href={url} target="_blank">
          <AiOutlinePaperClip className="w-4 h-4" />
          <span className="ml-1 truncate" title={name}>
            {name}
          </span>
        </a>
      ))}
    </div>
  );
}

function useAutoScrollIntoView(id: string) {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const isActive = hash === `#${id}`;

  useEffect(() => {
    if (!isActive || !ref.current) {
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

  return { ref, isActive };
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
