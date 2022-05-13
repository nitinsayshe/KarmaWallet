import { Aggregate, PaginateModel, PaginateOptions } from 'mongoose';

export interface IAggregatePaginateResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  page?: number | undefined;
  totalPages: number;
  nextPage?: number | null | undefined;
  prevPage?: number | null | undefined;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  meta?: any;
  [key: string]: T[] | number | boolean | null | undefined;
}

export interface IAggregatePaginateModel<T, TQueryHelpers = {}, TMethods = {}, TVirtuals = {}> extends PaginateModel<T, TQueryHelpers, TMethods, TVirtuals> {
  aggregatePaginate(
    query?: Aggregate<T[]>,
    options?: PaginateOptions,
    callback?: (err: any, result: IAggregatePaginateResult<T>) => void,
  ): Promise<IAggregatePaginateResult<T>>;
}
