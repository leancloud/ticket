import { useConfig, useUpdateConfig } from '@/api/config';
import {
  Button,
  Checkbox,
  CheckboxOptionType,
  Input,
  message,
  TimePicker,
} from '@/components/antd';
import moment, { Moment } from 'moment';
import { useState } from 'react';

const Days = [1, 2, 3, 4, 5, 6, 0];
const DAY_LOCALE: Record<string, string> = {
  '1': '星期一',
  '2': '星期二',
  '3': '星期三',
  '4': '星期四',
  '5': '星期五',
  '6': '星期六',
  '0': '星期日',
};
const DaysOptions = Days.map((v) => {
  return {
    label: DAY_LOCALE[`${v}`],
    value: v,
  } as CheckboxOptionType;
});
const WEEKDAY_KEY = 'weekday';
const Weekdays = () => {
  const { data, isLoading, isFetching } = useConfig<number[]>(WEEKDAY_KEY);
  const { mutateAsync, isLoading: updating } = useUpdateConfig<number[]>(WEEKDAY_KEY);
  return (
    <div className="mb-4">
      <h4>工作日</h4>
      <Checkbox.Group
        disabled={isLoading || isFetching || updating}
        options={DaysOptions}
        value={data}
        onChange={(values) => {
          mutateAsync(values as number[]).then(() => {
            message.success('设置成功，下一次统计将按照新的设置计算相关统计项');
          });
        }}
      />
    </div>
  );
};

const WORK_TIME = 'work_time';

type WorkTime = {
  from: Record<'hours' | 'minutes' | 'seconds', number>;
  to: Record<'hours' | 'minutes' | 'seconds', number>;
};
const WeekdayTime = () => {
  const [from, setFrom] = useState<Moment>();
  const [to, setTo] = useState<Moment>();
  const { isLoading, isFetching } = useConfig<WorkTime>(WORK_TIME, {
    onSuccess: (data) => {
      setFrom(moment().set(data.from));
      setTo(moment().set(data.to));
    },
  });
  const { mutateAsync, isLoading: updating } = useUpdateConfig<WorkTime>(WORK_TIME);
  return (
    <div className="mb-4">
      <h4>工作时间</h4>
      <Input.Group compact>
        <TimePicker.RangePicker
          disabled={isLoading || isFetching || updating}
          value={from && to ? [from, to] : undefined}
          onChange={(values) => {
            if (!values) {
              return;
            }
            setFrom(values[0]!);
            setTo(values[1]!);
          }}
        />
        <Button
          type="primary"
          loading={updating}
          disabled={!from || !to || updating}
          onClick={() => {
            if (!from || !to) {
              return;
            }
            mutateAsync({
              from: {
                hours: from.get('hours'),
                minutes: from.get('minutes'),
                seconds: from.get('seconds'),
              },
              to: {
                hours: to.get('hours'),
                minutes: to.get('minutes'),
                seconds: to.get('seconds'),
              },
            }).then(() => {
              message.success('设置成功，下一次统计将按照新的设置计算相关统计项');
            });
          }}
        >
          保存
        </Button>
      </Input.Group>
    </div>
  );
};

export function Weekday() {
  return (
    <>
      <Weekdays />
      <WeekdayTime />
    </>
  );
}
