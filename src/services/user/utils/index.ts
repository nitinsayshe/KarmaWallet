import { AxiosInstance } from 'axios';
import { FilterQuery, PaginateResult, Types } from 'mongoose';
import { sleep } from '../../../lib/misc';
import { IUser, IUserDocument, UserModel } from '../../../models/user';

export type IterationRequest<T> = {
  httpClient?: AxiosInstance;
  batchQuery: FilterQuery<IUser>;
  batchLimit: number;
  fields?: T;
};

export type IterationResponse<T> = {
  userId: Types.ObjectId;
  fields?: T;
};

export const iterateOverUsersAndExecWithDelay = async <Req, Res>(
  request: IterationRequest<Req>,
  exec: (req: IterationRequest<Req>, userBatch: PaginateResult<IUserDocument>) => Promise<IterationResponse<Res>[]>,
  msDelayBetweenBatches: number,
): Promise<IterationResponse<Res>[]> => {
  let report: IterationResponse<Res>[] = [];

  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const userBatch = await UserModel.paginate(request.batchQuery, {
      page,
      limit: request.batchLimit,
    });

    console.log('total users matching query: ', userBatch.totalDocs);
    const userReports = await exec(request, userBatch);

    console.log(`Prepared ${userReports.length} user reports`);
    report = report.concat(userReports);

    sleep(msDelayBetweenBatches);

    hasNextPage = userBatch?.hasNextPage || false;
    page++;
  }
  return report;
};
