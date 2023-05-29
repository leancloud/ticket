import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { keyBy } from 'lodash-es';
import { TagMetadataSchema, useTagMetadatas } from '@/api/tag-metadata';
import { useUpdateTicket } from '@/api/ticket';
import { Button, Input, Select, Skeleton } from '@/components/antd';
import { useTicket_v1, V1_Ticket } from './api1';
import { FormField } from './components/FormField';

interface TagFormProps {
  ticketId: string;
}

export function TagForm({ ticketId }: TagFormProps) {
  const { data: tagMetadatas } = useTagMetadatas();
  const { data: ticket } = useTicket_v1(ticketId);

  const [values, privateValues] = useMemo(() => {
    if (!ticket) {
      return [{}, {}];
    }
    const values = keyBy(ticket.tags, (tag) => tag.key);
    const privateValues = keyBy(ticket.private_tags, (tag) => tag.key);
    return [values, privateValues];
  }, [ticket]);

  const queryClient = useQueryClient();

  const { mutate, isLoading: updating } = useUpdateTicket({
    onSuccess: (_, [, { tags, privateTags }]) => {
      queryClient.setQueryData<V1_Ticket | undefined>(['v1_ticket', ticketId], (prev) => {
        if (prev) {
          return {
            ...prev,
            tags: tags ?? prev.tags,
            private_tags: privateTags ?? prev.private_tags,
          };
        }
      });
    },
  });

  const handleChange = (key: string, value: string | undefined, isPrivate: boolean) => {
    if (!ticket) {
      return;
    }
    const oldTags = isPrivate ? ticket.private_tags : ticket.tags;
    const newTags: typeof oldTags = [];
    let inOldTags = false;
    oldTags.forEach((tag) => {
      if (tag.key === key) {
        inOldTags = true;
        if (value !== undefined) {
          newTags.push({ key, value });
        }
      } else {
        newTags.push(tag);
      }
    });
    if (!inOldTags && value !== undefined) {
      newTags.push({ key, value });
    }
    mutate([ticketId, { [isPrivate ? 'privateTags' : 'tags']: newTags }]);
  };

  if (!tagMetadatas) {
    return <Skeleton active />;
  }

  if (tagMetadatas.length === 0) {
    return null;
  }

  return (
    <div>
      {tagMetadatas.map((tagMetadata) => (
        <TagField
          key={tagMetadata.id}
          tagMetadata={tagMetadata}
          tag={tagMetadata.private ? privateValues[tagMetadata.key] : values[tagMetadata.key]}
          loading={updating}
          onChange={handleChange}
        />
      ))}
    </div>
  );
}

interface TagFieldProps {
  tagMetadata: TagMetadataSchema;
  tag?: {
    key: string;
    value: string;
  };
  loading?: boolean;
  onChange: (key: string, value: string | undefined, isPrivate: boolean) => void;
}

function TagField({ tagMetadata, tag, loading, onChange }: TagFieldProps) {
  const [textValue, setTextValue] = useState('');
  useEffect(() => setTextValue(tag ? tag.value : ''), [tag]);

  const options = useMemo(() => {
    return tagMetadata.values?.map((value) => ({ label: value, value }));
  }, [tagMetadata.values]);

  const dirty = useMemo(() => (tag ? textValue !== tag.value : !!textValue), [tag, textValue]);

  return (
    <FormField label={tagMetadata.key}>
      {tagMetadata.type === 'text' && (
        <Input.Group compact style={{ display: 'flex' }}>
          <Input
            placeholder="未设置"
            value={textValue}
            disabled={loading}
            onChange={(e) => setTextValue(e.target.value)}
          />
          {dirty && (
            <Button
              loading={loading}
              onClick={() => onChange(tagMetadata.key, textValue, tagMetadata.private)}
            >
              保存
            </Button>
          )}
        </Input.Group>
      )}
      {tagMetadata.type === 'select' && (
        <Select
          allowClear
          placeholder="未设置"
          options={options}
          value={tag?.value}
          disabled={loading}
          onChange={(value) => onChange(tagMetadata.key, value, tagMetadata.private)}
          style={{ width: '100%' }}
        />
      )}
    </FormField>
  );
}
