import { SandboxedJob } from 'bullmq';
import { ActiveCampaignClient, IContactsData, IContactsImportData } from '../clients/activeCampaign';
import { FieldIds, FieldValues, getBackfillSubscribeList, getUserGroups, prepareBackfillSyncFields, prepareDailyUpdatedFields, prepareInitialSyncFields, prepareMonthlyUpdatedFields, prepareWeeklyUpdatedFields, prepareYearlyUpdatedFields } from '../integrations/activecampaign';
import { ActiveCampaignSyncTypes } from '../lib/constants/activecampaign';
import { JobNames } from '../lib/constants/jobScheduler';
import { ProviderProductIdToSubscriptionCode } from '../lib/constants/subscription';
import { getUtcDate } from '../lib/date';
import { sleep } from '../lib/misc';
import { IUserDocument, UserModel } from '../models/user';
import { updateUserSubscriptions } from '../services/subscription';
import { ActiveCampaignListId } from '../types/subscription';

interface IJobData {
  syncType: ActiveCampaignSyncTypes
}
const prepareSyncUsersRequest = async (
  users: Array<IUserDocument>,
  customFields: FieldIds,
  syncType: ActiveCampaignSyncTypes,
): Promise<IContactsImportData> => {
  // skip users with no email
  const contacts = await Promise.all(
    users.filter((user) => {
      if (user.emails && user.emails.length > 0) {
        return true;
      }
      return false;
    }).map(async (user) => {
      const contact: IContactsData = {
        email: user.emails.find(e => e.primary).email.trim(),
      };
      let fields: FieldValues = [];
      let subscribe: ActiveCampaignListId[] = [];
      let tags: string[] = [];

      switch (syncType) {
        case ActiveCampaignSyncTypes.DAILY:
          fields = await prepareDailyUpdatedFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.WEEKLY:
          fields = await prepareWeeklyUpdatedFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.MONTHLY:
          fields = await prepareMonthlyUpdatedFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.QUARTERLY:
          fields = await prepareMonthlyUpdatedFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.YEARLY:
          fields = await prepareYearlyUpdatedFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.INITIAL:
          contact.first_name = user.name?.split(' ')[0];
          contact.last_name = user.name?.split(' ').pop();
          fields = await prepareInitialSyncFields(user, customFields, []);
          break;
        case ActiveCampaignSyncTypes.BACKFILL:
          contact.first_name = user.name?.split(' ')[0];
          contact.last_name = user.name?.split(' ').pop();
          fields = await prepareBackfillSyncFields(user, customFields);
          subscribe = await getBackfillSubscribeList(user.dateJoined);
          tags = await getUserGroups(user);
          break;
        default:
          console.error('Invalid sync type');
          break;
      }
      contact.fields = fields;
      contact.subscribe = subscribe.map((listId) => ({ listid: listId }));
      contact.tags = tags;
      await updateUserSubscriptions(
        user._id,
        subscribe.map((id) => (ProviderProductIdToSubscriptionCode[id])),
        [],
      );
      return contact;
    }),
  );
  return { contacts };
};

export const onComplete = () => {
  console.log(`${JobNames.SyncActiveCampaign} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.SyncActiveCampaign} failed`);
  console.log(err);
};

export const exec = async ({ syncType }: IJobData) => {
  try {
    const ac = new ActiveCampaignClient();
    const customFields = await ac.getCustomFieldIDs();

    let users;
    const currentUpdateDateTime = getUtcDate();
    const batchSize = 125;
    const msBetweenBatches = 2000;
    do {
      // find users where the latestSyncDate is null, doesn't exist, or isn't equal to the current date
      users = await UserModel.find({ $or: [
        { 'integrations.activecampaign.latestSyncDate': { $exists: false } },
        { 'integrations.activecampaign.latestSyncDate': null },
        { 'integrations.activecampaign.latestSyncDate': { $ne: currentUpdateDateTime } },
      ] }).limit(batchSize);
      if (!users || users.length === 0) {
        continue;
      }

      //  compose active campaign request
      const contacts = await prepareSyncUsersRequest(
        users,
        customFields,
        syncType,
      );

      //  send request
      //  NOTE: The maximum payload size of a single bulk_import request must be less than less than 400K bytes (399,999 bytes or less).
      //  including "exclude_automations: true" in the request will prevent automations from running. Could be useful for initial import
      await ac.importContacts(contacts);

      // update the user's latestSyncDate
      await Promise.all(
        users.map(async (user) => {
          await UserModel.findByIdAndUpdate(user._id, {
            'integrations.activecampaign.latestSyncDate': currentUpdateDateTime,
          });
        }),
      );
      await sleep(msBetweenBatches);
    } while (users && users.length > 0);
  } catch (err) {
    console.error(err);
  }
};
