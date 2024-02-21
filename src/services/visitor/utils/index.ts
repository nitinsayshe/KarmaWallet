import { AxiosInstance } from 'axios';
import { FilterQuery, Types, PaginateResult } from 'mongoose';
import { sleep } from '../../../lib/misc';
import { IVisitor, IVisitorDocument, VisitorModel } from '../../../models/visitor';

export type VisitorIterationRequest<T> = {
  httpClient?: AxiosInstance;
  batchQuery: FilterQuery<IVisitor>;
  batchLimit: number;
  fields?: T;
};

export type VisitorIterationResponse<T> = {
  visitorId: Types.ObjectId;
  fields?: T;
};

export const iterateOverVisitorsAndExecWithDelay = async <Req, Res>(
  request: VisitorIterationRequest<Req>,
  exec: (req: VisitorIterationRequest<Req>, userBatch: PaginateResult<IVisitorDocument>) => Promise<VisitorIterationResponse<Res>[]>,
  msDelayBetweenBatches: number,
): Promise<VisitorIterationResponse<Res>[]> => {
  let report: VisitorIterationResponse<Res>[] = [];

  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const visitorBatch = await VisitorModel.paginate(request.batchQuery, {
      page,
      limit: request.batchLimit,
    });

    console.log('total visitors matching query: ', visitorBatch.totalDocs);
    const visitorReports = await exec(request, visitorBatch);

    console.log(`Prepared ${visitorReports.length} visitor reports`);
    report = report.concat(visitorReports);

    await sleep(msDelayBetweenBatches);

    hasNextPage = visitorBatch?.hasNextPage || false;
    page++;
  }
  return report;
};
