import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { SandboxedJob } from 'bullmq';
import { GoogleClient, ICreateFileRequest } from '../clients/google';
import { JobNames, CsvReportTypes } from '../lib/constants/jobScheduler';
import { generateTransactionCsv } from '../services/scripts/generate-transaction-csv';
import { generateUserEmailList } from '../services/scripts/generate-user-email-list';
import { getUsersFromAffiliates } from '../services/scripts/get_users_from_affiliates';

dayjs.extend(utc);

const REPORTS_DRIVE_ID = '0AHtVuSQh9gY8Uk9PVA';
const TRANSACTIONS_DIR_ID = '1sUGlRqT7aGkIkdZbGekw9cBf_n-s16tp';
const USERS_DIR_ID = '1xioILq7VkBNgRk2lU3wpUIXPWrpU7L3d';
const AFFILLIATES_DIR_ID = '12yBt8x1NGH8Cb6ZcXOrZxRneO2prYxct';
const TEAM_DRIVE_ID = '0AEkS27SvUhoBUk9PVA';

export interface ITransactionCsvJobParams {
  reportType: CsvReportTypes;
}

export const exec = async ({ reportType = CsvReportTypes.Transactions }: ITransactionCsvJobParams) => {
  await GoogleClient.init();
  let csv: string;
  let createFileRequest: ICreateFileRequest;
  const timeString = dayjs().format('DD-MM-YYYY-mm:ss');
  switch (reportType) {
    case CsvReportTypes.Transactions: {
      csv = await generateTransactionCsv({ writeToDisk: false });
      createFileRequest = {
        fileName: `transactions_${timeString}.csv`,
        parents: [TRANSACTIONS_DIR_ID],
        teamDriveId: REPORTS_DRIVE_ID,
        mimeType: 'text/csv',
        body: csv,
      };
      break;
    }
    case CsvReportTypes.Users: {
      csv = await generateUserEmailList({ writeToDisk: false });
      createFileRequest = {
        fileName: `users_${timeString}.csv`,
        parents: [USERS_DIR_ID],
        teamDriveId: REPORTS_DRIVE_ID,
        mimeType: 'text/csv',
        body: csv,
      };
      break;
    }
    // generates a list of users from afilliates from the last full month
    case CsvReportTypes.Affiliates: {
      csv = await getUsersFromAffiliates({ writeToDisk: false, allTime: true });
      createFileRequest = {
        fileName: `affilliates_${timeString}.csv`,
        parents: [AFFILLIATES_DIR_ID],
        teamDriveId: TEAM_DRIVE_ID,
        mimeType: 'text/csv',
        body: csv,
      };
      break;
    }
    default: {
      throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  await GoogleClient.createFile(createFileRequest);
  return `Uploaded ${reportType} CSV with filename: ${createFileRequest.fileName} to Google Drive`;
};

export const onComplete = async (_: SandboxedJob, result: string) => {
  console.log(`${JobNames.SendEmail} finished: \n ${result}`);
};
