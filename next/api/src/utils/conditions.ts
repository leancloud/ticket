import { Model, Query } from '@/orm';

export const addInOrNotExistCondition = <T extends typeof Model>(
  query: Query<T>,
  data: string[],
  fieldName: string
) => {
  query.where((query) => {
    const dataWithoutNull = data.filter((d) => d !== 'null');

    if (dataWithoutNull.length !== data.length) {
      query.where(fieldName, 'not-exists');

      if (dataWithoutNull.length) {
        query.orWhere(fieldName, 'in', dataWithoutNull);
      }
    } else {
      query.where(fieldName, 'in', dataWithoutNull);
    }
  });
};
