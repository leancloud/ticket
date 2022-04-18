import { Controller } from 'react-hook-form';

import { Select } from '@/components/antd';
import { TagSelect } from '../components/TagSelect';

const { Option } = Select;

export function Tags({ path }: { path: string }) {
  return (
    <>
      <Controller
        name={`${path}.op`}
        defaultValue="contains"
        render={({ field }) => (
          <Select {...field} style={{ width: 220 }}>
            <Option value="contains">包含</Option>
          </Select>
        )}
      />

      <TagSelect path={path} />
    </>
  );
}
