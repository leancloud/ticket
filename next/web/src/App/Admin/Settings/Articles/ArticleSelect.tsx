import { forwardRef, useMemo } from 'react';
import { RefSelectProps } from 'antd/lib/select';
import { useArticles } from '@/api/article';
import { Select, SelectProps } from '@/components/antd';

export const ArticleSelect = forwardRef<RefSelectProps, SelectProps<string[] | string>>(
  (props, ref) => {
    const { data, isLoading } = useArticles();
    const options = useMemo(() => {
      return data?.map((article) => ({
        label: article.name,
        value: article.id,
      }));
    }, [data]);

    return (
      <Select
        {...props}
        ref={ref}
        className="w-full"
        loading={isLoading}
        mode="multiple"
        allowClear
        showArrow
        options={options}
        optionFilterProp="label"
        maxTagTextLength={12}
      />
    );
  }
);
