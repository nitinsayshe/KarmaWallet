import { Types, isValidObjectId } from 'mongoose';

export const convertFilterToObjectId = (filter: any) => {
  const convertedFilter: any = {};
  const keys = Object.keys(filter);
  if (!keys.length) return null;
  for (const key of keys) {
    const value = filter[key];
    if (value === null || value === undefined) {
      convertedFilter[key] = value;
      continue;
    }
    const isArray = Array.isArray(value);
    const isString = typeof value === 'string';
    const isObject = typeof value === 'object';

    if (isArray) {
      const areAllValuesObjectIds = value.every((v) => isValidObjectId(v));
      if (!areAllValuesObjectIds) {
        convertedFilter[key] = value;
        continue;
      }
      convertedFilter[key] = value.map((v) => new Types.ObjectId(v));
      continue;
    }

    if (isString) {
      const isObjectId = isValidObjectId(value);
      if (!isObjectId) {
        convertedFilter[key] = value;
        continue;
      }
      convertedFilter[key] = new Types.ObjectId(value);
      continue;
    }

    if (isObject) {
      const newFilter = convertFilterToObjectId(value);
      convertedFilter[key] = newFilter;
      continue;
    }
  }
  return convertedFilter;
};
