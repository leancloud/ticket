import { z } from 'zod';
import _ from 'lodash';

import { Condition, ConditionFactory } from '.';

interface MetaDataCondition {
  path: string;
  value: any;
}

const is: ConditionFactory<MetaDataCondition> = ({ path, value }) => {
  return {
    test: (ctx) => {
      const metaData = ctx.getMetaData();
      if (!metaData) {
        return false;
      }
      return _.isEqual(_.get(metaData, path), value);
    },
  };
};

const schema = z.object({
  op: z.literal('is'),
  path: z.string(),
  value: z.any(),
});

export default function (options: unknown): Condition {
  const { path, value } = schema.parse(options);
  return is({ path, value });
}
