import { RefCallback, useCallback, useRef } from 'react';
import { Editor, EditorProps } from '@toast-ui/react-editor';
import type ToastuiEditor from '@toast-ui/editor';

import '@toast-ui/editor/dist/i18n/zh-cn';
import '@toast-ui/editor/dist/toastui-editor.css';
import { useLocalStorage } from 'react-use';
import { storage } from '@/leancloud';

export interface MarkdownEditorProps
  extends Omit<EditorProps, 'hooks' | 'toolbarItems' | 'initialValue' | 'ref'> {}

const toolbarItems = [
  ['heading', 'bold', 'italic', 'strike'],
  ['ul', 'ol', 'indent', 'outdent'],
  ['table', 'image', 'link'],
  ['hr', 'quote'],
  ['code', 'codeblock'],
];

const hooks: EditorProps['hooks'] = {
  addImageBlobHook: (blob, cb) => {
    storage
      .upload((blob as File).name ?? 'filename', blob)
      .then((result) => cb(result.url))
      .catch((error) => alert(error.message));
  },
};

export function useMarkdownEditor(initialValue: string, props: MarkdownEditorProps = {}) {
  const $editorRef = useRef<{ TUIEditor: ToastuiEditor | null }>({ TUIEditor: null });
  const getValue = useCallback(() => $editorRef.current.TUIEditor?.getMarkdown(), []);
  const [editorMode = 'wysiwyg', setEditorMode] = useLocalStorage<'markdown' | 'wysiwyg'>(
    'TapDesk:editorMode'
  );

  const onEditorInit = useCallback((editor: ToastuiEditor) => {
    editor.on('changeMode', setEditorMode);
  }, []);

  const ref: RefCallback<Editor> = (editor) => {
    if (editor) {
      const TUIEditor = editor.getInstance();
      if ($editorRef.current.TUIEditor === TUIEditor) return;
      onEditorInit(TUIEditor);
      $editorRef.current.TUIEditor = TUIEditor;
    }
  };

  const {
    height = '500px',
    initialEditType = editorMode,
    previewStyle = 'vertical',
    autofocus = false,
    ...rest
  } = props;

  const editor = (
    <Editor
      {...rest}
      ref={ref}
      initialValue={initialValue}
      height={height}
      initialEditType={initialEditType}
      previewStyle={previewStyle}
      useCommandShortcut={true}
      usageStatistics={false}
      hooks={hooks}
      toolbarItems={toolbarItems}
      language="zh-CN"
      autofocus={autofocus}
    />
  );

  return [editor, getValue, $editorRef] as const;
}
