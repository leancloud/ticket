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
