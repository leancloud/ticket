import * as yup from 'yup';

export * from 'yup';

export const csv: typeof yup.array = (type) => {
  const schema = yup.array(type);
  schema.transforms.unshift((value) => {
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value;
  });
  return schema as any;
};

export const dateRange = () => {
  const schema = yup.array(yup.date()).transform((value) => {
    if (value[0] || value[1]) {
      // filter [undefined, undefined];
      return value;
    }
  });
  schema.transforms.unshift((value) => {
    if (typeof value === 'string') {
      return value
        .split('..')
        .slice(0, 2)
        .map((v) => {
          if (!v || v === '*') {
            return undefined;
          } else {
            return v;
          }
        });
    }
  });
  return schema;
};
