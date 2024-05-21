import { FilterQuery, Types, PaginateResult } from 'mongoose';
import { sleep } from '../../../lib/misc';
import { IVisitor, IVisitorDocument, VisitorModel } from '../../../models/visitor';

export type VisitorIterationRequest<FieldsType> = {
  batchQuery: FilterQuery<IVisitor>;
  batchLimit: number;
  fields?: FieldsType;
};

export type VisitorIterationResponse<FieldsType> = {
  visitorId: Types.ObjectId;
  fields?: FieldsType;
};

export const iterateOverVisitorsAndExecWithDelay = async <ReqFieldsType, ResFieldsType>(
  request: VisitorIterationRequest<ReqFieldsType>,
  exec: (req: VisitorIterationRequest<ReqFieldsType>, visitorBatch: PaginateResult<IVisitorDocument>) => Promise<VisitorIterationResponse<ResFieldsType>[]>,
  msDelayBetweenBatches: number,
): Promise<VisitorIterationResponse<ResFieldsType>[]> => {
  let report: VisitorIterationResponse<ResFieldsType>[] = [];

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
