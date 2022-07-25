import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { JobReportModel, JobReportStatus } from '../../../models/jobReport';

dayjs.extend(utc);

export interface IUpdateJobReportData {
  message: string;
  status: JobReportStatus;
}

export const updateJobReport = async (jobReportId: string, reportStatus: JobReportStatus, data: IUpdateJobReportData | IUpdateJobReportData[] = []) => {
  const messages = Array.isArray(data) ? data : [data];

  try {
    const timestamp = dayjs().utc().toDate();
    const jobReport = await JobReportModel.findById(jobReportId);

    const allMessages = [...jobReport.data];

    for (const { message, status } of messages) {
      allMessages.unshift({
        status,
        message,
        createdAt: timestamp,
      });
    }

    if (!!reportStatus) jobReport.status = reportStatus;
    jobReport.data = allMessages;
    jobReport.lastModified = timestamp;
    await jobReport.save();
  } catch (err) {
    console.log(`[-] error updating job report:\n\t- job report id: ${jobReportId}\n\t- status: ${reportStatus}\n\t- data: ${data}`);
    console.log(err, '\n');
  }
};
