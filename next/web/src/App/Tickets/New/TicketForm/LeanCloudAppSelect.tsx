import { forwardRef, useMemo } from 'react';
import { groupBy } from 'lodash-es';
import { RefSelectProps } from 'antd/lib/select';

import { LeanCloudRegion, useLeanCloudApps } from '@/leancloud';
import { Select, SelectProps } from '@/components/antd';

const { OptGroup, Option } = Select;

const regionName: Record<LeanCloudRegion, string> = {
  'cn-n1': '华北',
  'cn-e1': '华东',
  'us-w1': '国际',
};

export interface LeanCloudAppSelectProps extends SelectProps<string> {}

export const LeanCloudAppSelect = forwardRef<RefSelectProps, LeanCloudAppSelectProps>(
  (props, ref) => {
    const { data } = useLeanCloudApps();
    const appsByRegion = useMemo(() => groupBy(data, 'region'), [data]);
    const optionGroups = useMemo(() => {
      return Object.entries(regionName).map(([region, regionName]) => {
        const apps = appsByRegion[region];
        if (!apps || apps.length === 0) {
          return null;
        }
        return (
          <OptGroup key={region} label={regionName}>
            {apps.map(({ app_id, app_name }) => (
              <Option key={app_id} value={app_id}>
                {app_name}
              </Option>
            ))}
          </OptGroup>
        );
      });
    }, [appsByRegion]);

    return (
      <Select {...props} ref={ref} showSearch optionFilterProp="children">
        {optionGroups}
      </Select>
    );
  }
);
