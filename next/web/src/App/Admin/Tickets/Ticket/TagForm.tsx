import { ReactNode, useEffect, useMemo, useState } from 'react';
import { AiFillEyeInvisible } from 'react-icons/ai';
import { fromPairs, keyBy } from 'lodash-es';

import { TagMetadataSchema } from '@/api/tag-metadata';
import { Input, Select, Tooltip } from '@/components/antd';
import { FormField } from './components/FormField';

export interface TagData {
  key: string;
  value: string;
}

interface TagFormProps {
  tagMetadatas: TagMetadataSchema[];
  tags: TagData[];
  privateTags: TagData[];
  onUpdate: (data: TagData[], isPrivate: boolean) => void;
  updating?: boolean;
}

export function TagForm({ tagMetadatas, tags, privateTags, onUpdate, updating }: TagFormProps) {
  const valueMap = useMemo(() => {
    return fromPairs(tags.map((tag) => [tag.key, tag.value]));
  }, [tags]);

  const privateValueMap = useMemo(() => {
    return fromPairs(privateTags.map((tag) => [tag.key, tag.value]));
  }, [privateTags]);

  const handleChange = (tag: TagMetadataSchema, value: string | undefined) => {
    const oldValues = tag.private ? privateTags : tags;
    const newValueMap = keyBy(oldValues, (v) => v.key);
    if (value === undefined) {
      delete newValueMap[tag.key];
    } else {
      newValueMap[tag.key] = { key: tag.key, value };
    }
    const newValues = Object.values(newValueMap);
    onUpdate(newValues, tag.private);
  };

  return (tagMetadatas.map((tag) => (
    <TagField
      key={tag.id}
      tag={tag}
      value={tag.private ? privateValueMap[tag.key] : valueMap[tag.key]}
      loading={updating}
      onChange={(value) => handleChange(tag, value)}
    />
  )) as any) as JSX.Element;
}

interface TagFieldProps {
  tag: TagMetadataSchema;
  value?: string;
  loading?: boolean;
  onChange: (value: string) => void;
}

function TagField(props: TagFieldProps) {
  if (props.tag.type === 'text') {
    return <TextTag {...props} />;
  }

  if (props.tag.type === 'select') {
    return <SelectTag {...props} />;
  }

  return <div className="text-red-500">unknown tag type {props.tag.type}</div>;
}

function TextTag({ tag, value, loading, onChange }: TagFieldProps) {
  const [tempValue, setTempValue] = useState('');
  useEffect(() => setTempValue(value || ''), [value]);

  const dirty = value ? tempValue !== value : !!tempValue;

  return (
    <FormField
      label={
        <FieldLabel label={tag.key} userInvisible={tag.private}>
          {dirty && (
            <button
              className="text-primary disabled:text-gray-400 shrink-0 ml-2"
              disabled={loading}
              onClick={() => onChange(tempValue)}
            >
              保存
            </button>
          )}
        </FieldLabel>
      }
    >
      <Input
        placeholder="未设置"
        value={tempValue}
        disabled={loading}
        onChange={(e) => setTempValue(e.target.value)}
      />
    </FormField>
  );
}

function SelectTag({ tag, value, loading, onChange }: TagFieldProps) {
  const options = useMemo(() => {
    return tag.values?.map((value) => ({ label: value, value }));
  }, [tag.values]);

  return (
    <FormField label={<FieldLabel label={tag.key} userInvisible={tag.private} />}>
      <Select
        className="w-full"
        allowClear
        placeholder="未设置"
        options={options}
        value={value}
        disabled={loading}
        onChange={onChange}
      />
    </FormField>
  );
}

interface FieldLabelProps {
  label: string;
  userInvisible?: boolean;
  children?: ReactNode;
}

function FieldLabel({ label, userInvisible, children }: FieldLabelProps) {
  return (
    <div className="flex items-center">
      <div className="truncate" title={label}>
        {label}
      </div>
      {userInvisible && (
        <Tooltip title="用户不可见">
          <AiFillEyeInvisible className="ml-1 inline-block w-4 h-4 shrink-0" />
        </Tooltip>
      )}
      <div className="grow" />
      {children}
    </div>
  );
}
