import { JobNames, MarqetaDataSyncTypeEnum, MarqetaSyncJobTypeEnumValues } from '../lib/constants/jobScheduler';
import { marqetaCardSync, marqetaTransactionSync, marqetaUserSync } from '../services/scripts/marqetaDataSync';

interface IJobData {
  startDate?: Date;
  endDate?: Date;
  syncTypes: MarqetaSyncJobTypeEnumValues[];
}

export const handleTransactionSync = async (startDate: Date, endDate: Date) => {
  if (!startDate) throw new Error('startDate is required');
  if (!endDate) throw new Error('endDate is required');

  await marqetaTransactionSync({
    startDate,
    endDate,
  });
};

export const handleUserSync = async () => {
  await marqetaUserSync();
};

export const handleCardSync = async () => {
  await marqetaCardSync();
};

export const handleSyncJobType = async (syncType: MarqetaSyncJobTypeEnumValues, data: Partial<IJobData>) => {
  switch (syncType) {
    case MarqetaDataSyncTypeEnum.Transactions:
      await handleTransactionSync(data?.startDate, data?.endDate);
      break;
    case MarqetaDataSyncTypeEnum.Users:
      await handleUserSync();
      break;
    case MarqetaDataSyncTypeEnum.Cards:
      await handleCardSync();
      break;
    default:
      throw new Error('Invalid syncJobType');
  }
};

export const exec = async (data: IJobData) => {
  for (const syncJobType of data.syncTypes) {
    await handleSyncJobType(syncJobType, data);
  }
};

export const onComplete = async () => {
  console.log(`${JobNames.MarqetaDataSync} finished`);
};
