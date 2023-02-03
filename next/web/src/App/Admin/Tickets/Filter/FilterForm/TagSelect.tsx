import { useTagMetadatas } from '@/api/tag-metadata';
import { Select } from '@/components/antd';
import { useMemo } from 'react';

const EMPTY_VALUE = '';

export interface TagSelectValue {
  tagKey?: string;
  tagValue?: string;
  privateTagKey?: string;
  privateTagValue?: string;
}

export interface TagSelectProps {
  value?: TagSelectValue;
  onChange: (value: TagSelectValue) => void;
  disabled?: boolean;
}

export function TagSelect({ value, onChange, disabled }: TagSelectProps) {
  const { data, isLoading } = useTagMetadatas();

  const options = useMemo(
    () => [
      { label: '任何', value: EMPTY_VALUE },
      ...(data ?? [])
        .filter((t) => t.type === 'select')
        .map((t) => ({
          label: t.key,
          value: t.key,
        })),
    ],
    [data]
  );

  const isPrivate = !!(value && (value.privateTagKey || value.privateTagValue));
  const tagKey = isPrivate ? value?.privateTagKey : value?.tagKey;
  const tagValue = isPrivate ? value?.privateTagValue : value?.tagValue;

  const tag = useMemo(() => {
    return data?.find((t) => t.key === tagKey);
  }, [data, tagKey]);

  const valueOptions = useMemo(
    () => [
      { label: '任何', value: EMPTY_VALUE },
      ...(tag?.values?.map((v) => ({ label: v, value: v })) ?? []),
    ],
    [tag]
  );

  const handleChange = (key?: string, value?: string, isPrivate = false) => {
    onChange({
      tagKey: isPrivate ? undefined : key,
      tagValue: isPrivate ? undefined : value,
      privateTagKey: isPrivate ? key : undefined,
      privateTagValue: isPrivate ? value : undefined,
    });
  };

  return (
    <>
      <Select
        className="w-full"
        loading={isLoading}
        options={options}
        value={tagKey ?? EMPTY_VALUE}
        onChange={(key) => {
          const tag = data?.find((t) => t.key === key);
          handleChange(key === EMPTY_VALUE ? undefined : key, undefined, tag?.private);
        }}
        disabled={disabled}
      />
      {tag && (
        <div className="pl-2 border-l border-gray-300 border-dashed">
          <div className="my-2 text-[#475867] text-sm font-medium">标签值</div>
          <Select
            className="w-full"
            options={valueOptions}
            value={tagValue ?? EMPTY_VALUE}
            onChange={(value) => handleChange(tag.key, value, tag.private)}
          />
        </div>
      )}
    </>
  );
}
