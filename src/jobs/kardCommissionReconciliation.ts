import { AwsClient } from '../clients/aws';
import { KardAwsEnv, KardIssuerIssuerName } from '../clients/kard';
import { KardEnvironmentEnumValues, KardEnvironmentEnum } from '../clients/kard/types';
import { mapKardCommissionToKarmaCommisison } from '../services/commission/utils';
import { createEarnedCashbackNotificationsFromCommission } from '../services/user_notification';

interface IJobData {
  startDate?: Date;
}

const getReconciliationFilesForKardEnvironment = async (kardEnvironment: KardEnvironmentEnumValues, startDate: Date) => {
  try {
    const awsClient = new AwsClient();

    console.log('assuming kard role for kard environment:', kardEnvironment);
    const basePrefix = `${KardAwsEnv}/kard/reconciliation/${KardIssuerIssuerName.toLowerCase()}/daily`;

    const backupFileWebhooks = await awsClient.assumeKardRoleAndGetBucketContents(
      kardEnvironment,
      'rewards-transactions',
      `${basePrefix}/backup/`,
      startDate,
    );
    console.log('backup file webhooks', backupFileWebhooks);

    const uploadFileWebhooks = await awsClient.assumeKardRoleAndGetBucketContents(
      kardEnvironment,
      'rewards-transactions',
      `${basePrefix}/upload/`,
      startDate,
    );
    console.log('upload file webhooks', uploadFileWebhooks);

    let mappedFromBackup = 0;
    await Promise.all(
      backupFileWebhooks.map(async (webhook) => {
        try {
          const backupFileCommission = await mapKardCommissionToKarmaCommisison(KardEnvironmentEnum.Issuer, webhook);
          if (!backupFileCommission.previouslyExisting) {
            await createEarnedCashbackNotificationsFromCommission(backupFileCommission.commission, ['email', 'push']);
          }

          mappedFromBackup++;
        } catch (err) {
          console.log(err);
        }
      }),
    );
    console.log('mapped from backup', mappedFromBackup);

    let mappedFromUpdate = 0;
    await Promise.all(
      uploadFileWebhooks.map(async (webhook) => {
        try {
          const uploadFileCommission = await mapKardCommissionToKarmaCommisison(kardEnvironment, webhook);
          if (!uploadFileCommission.previouslyExisting) {
            console.error(`this commission was expected to already exist, but was not found: ${uploadFileCommission.commission}`);
            await createEarnedCashbackNotificationsFromCommission(uploadFileCommission.commission, ['email', 'push']);
          }
          mappedFromUpdate++;
        } catch (err) {
          console.log(err);
        }
      }),
    );
    console.log('mapped from update', mappedFromUpdate);
  } catch (err) {
    console.log('Error getting reconciliation files for kard environment', kardEnvironment, err);
  }
};

export const exec = async (data?: IJobData) => {
  try {
    console.log('starting kard commission reconciliation job...');

    console.log('starting reconciliation for issuer environment commissions:');
    await getReconciliationFilesForKardEnvironment(KardEnvironmentEnum.Issuer, data?.startDate);
    console.log('getting reconciliation for aggregator environment commissions:');
    await getReconciliationFilesForKardEnvironment(KardEnvironmentEnum.Aggregator, data?.startDate);

    console.log('kard commission reconciliation job complete');
  } catch (err) {
    console.error(err);
  }
};
