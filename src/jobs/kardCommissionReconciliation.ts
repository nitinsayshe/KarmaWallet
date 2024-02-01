import { AwsClient } from '../clients/aws';
import { KardAwsEnv, KardEnvironmentEnum } from '../clients/kard';
import { mapKardCommissionToKarmaCommisison } from '../services/commission/utils';
import { createEarnedCashbackNotificationsFromCommission } from '../services/user_notification';

interface IJobData {
  startDate?: Date;
}

export const exec = async (data: IJobData) => {
  try {
    const awsClient = new AwsClient();
    console.log('assuming kard role');
    const backupFileWebhooks = await awsClient.assumeKardRoleAndGetBucketContents(
      'rewards-transactions',
      `${KardAwsEnv}/kard/reconciliation/karmawallet/daily/backup/`,
      data?.startDate,
    );
    console.log('backup file webhooks', backupFileWebhooks);
    const uploadFileWebhooks = await awsClient.assumeKardRoleAndGetBucketContents(
      'rewards-transactions',
      `${KardAwsEnv}/kard/reconciliation/karmawallet/daily/upload/`,
      data?.startDate,
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
          const uploadFileCommission = await mapKardCommissionToKarmaCommisison(KardEnvironmentEnum.Issuer, webhook);
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
    console.error(err);
  }
};
