import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MainBullClient } from '../../clients/bull/main';
import { ErrorTypes } from '../../lib/constants';
import { JobNames } from '../../lib/constants/jobScheduler';
import CustomError, { asCustomError } from '../../lib/customError';
import { IDataSourceDocument } from '../../models/dataSource';
import { IJobReportDocument, JobReportModel, JobReportStatus } from '../../models/jobReport';
import { IRequest } from '../../types/request';
import { Logger } from '../logger';

dayjs.extend(utc);

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
}: IDataSourceDocument) => ({
  _id,
  name,
  url,
  integrations,
});
