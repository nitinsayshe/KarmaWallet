import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery } from 'mongoose';
import { MainBullClient } from '../../clients/bull/main';
import { ErrorTypes } from '../../lib/constants';
import { JobNames } from '../../lib/constants/jobScheduler';
import CustomError, { asCustomError } from '../../lib/customError';
import { IDataSourceDocument, DataSourceModel, IDataSource } from '../../models/dataSource';
import { IJobReportDocument, JobReportModel, JobReportStatus } from '../../models/jobReport';
import { IRequest } from '../../types/request';
import { Logger } from '../logger';

dayjs.extend(utc);

export interface IGetDataSourcesQuery {
  limit?: string;
  maxRank?: string;
  minRank?: string;
  includeNoRank?: boolean;
}

export interface ICreateBatchedDataSourcesRequestBody {
  fileUrl: string;
}

export const createBatchedDataSources = async (req: IRequest<{}, {}, ICreateBatchedDataSourcesRequestBody>) => {
  let jobReport: IJobReportDocument;

  try {
    jobReport = new JobReportModel({
      initiatedBy: req.requestor._id,
      name: JobNames.CreateBatchDataSources,
      status: JobReportStatus.Pending,
      data: [
        {
          status: JobReportStatus.Completed,
          message: `Batch file uploaded successfully. URL: ${req.body.fileUrl}`,
          createdAt: dayjs().utc().toDate(),
        },
      ],
      createdAt: dayjs().utc().toDate(),
    });

    await jobReport.save();
  } catch (err: any) {
    Logger.error(asCustomError(err));
    throw new CustomError(`An error occurred while attempting to create a job report: ${err.message}`, ErrorTypes.SERVER);
  }

  try {
    const data = {
      fileUrl: req.body.fileUrl,
      jobReportId: jobReport._id,
    };

    MainBullClient.createJob(JobNames.CreateBatchDataSources, data);

    return { message: `Your request to create this batch of data sources is being processed, but it may take a while. Please check back later for status updates. (see Job Report: ${jobReport._id})` };
  } catch (err: any) {
    Logger.error(asCustomError(err));
    throw new CustomError(`An error occurred while attempting to create this job: ${err.message}`, ErrorTypes.SERVER);
  }
};

export const getShareableDataSource = ({
  _id,
  name,
  url,
  integrations,
  logoUrl,
  rank,
  description,
}: IDataSourceDocument) => ({
  _id,
  name,
  url,
  integrations,
  logoUrl,
  rank,
  description,
});

export const getDataSources = async (req: IRequest<{}, IGetDataSourcesQuery, {}>) => {
  const { query } = req;
  const { limit: _limit, maxRank, minRank, includeNoRank } = query;
  let limit: number;
  if (_limit) limit = parseInt(_limit, 10);
  const _query: FilterQuery<IDataSource> = { hidden: { $ne: true }, rank: { $exists: true } };
  if (includeNoRank) delete _query.rank;
  if (maxRank && !Number.isNaN(parseInt(maxRank, 10))) _query.rank = { $lte: maxRank };
  if (minRank && !Number.isNaN(parseInt(minRank, 10))) _query.rank = { $gte: minRank };
  const dataSources = await DataSourceModel.find(_query).sort({ rank: 1 }).limit(limit || null);
  return dataSources;
};
