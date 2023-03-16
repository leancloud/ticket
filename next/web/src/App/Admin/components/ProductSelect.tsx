import { useProducts } from '@/api/category';
import { Select, SelectProps } from 'antd';
import { useMemo } from 'react';

export interface ProductSelectProps extends SelectProps<string> {
  activeOnly?: boolean;
}

export const ProductSelect = ({ activeOnly, ...props }: ProductSelectProps) => {
  const { data: products, isLoading } = useProducts({ active: activeOnly });

  const options = useMemo(() => products?.map(({ id, name }) => ({ value: id, label: name })), [
    products,
  ]);

  return (
    <Select
      loading={isLoading}
      options={options}
      allowClear
      defaultValue={options?.[0].value}
      {...props}
    />
  );
};
