import { SandboxedJob } from 'bullmq';
import isemail from 'isemail';
import { ActiveCampaignClient, IContactsData, IContactsImportData } from '../clients/activeCampaign';
import { FieldIds, getUserGroups, prepareBackfillSyncFields, prepareDailyUpdatedFields, prepareInitialSyncFields, prepareMonthlyUpdatedFields, prepareSubscriptionListsAndTags, prepareWeeklyUpdatedFields, prepareYearlyUpdatedFields } from '../integrations/activecampaign';
import { UserGroupRole } from '../lib/constants';
import { ActiveCampaignSyncTypes } from '../lib/constants/activecampaign';
import { JobNames } from '../lib/constants/jobScheduler';
import { ProviderProductIdToSubscriptionCode, SubscriptionCodeToProviderProductId } from '../lib/constants/subscription';
import { getUtcDate } from '../lib/date';
import { sleep } from '../lib/misc';
import { IUserDocument, UserModel } from '../models/user';
import { UserGroupModel } from '../models/userGroup';
import { updateUserSubscriptions, UserSubscriptions } from '../services/subscription';
import { ActiveCampaignListId, SubscriptionCode } from '../types/subscription';

interface IJobData {
  syncType: ActiveCampaignSyncTypes
  userSubscriptions?: UserSubscriptions[]
}

const backfillSubscriberList = [ActiveCampaignListId.GeneralUpdates, ActiveCampaignListId.AccountUpdates];

const addGroupSubscriptionsToLists = async (user: IUserDocument, lists?: ActiveCampaignListId[]): Promise<ActiveCampaignListId[]> => {
  lists = lists || [];
  // if user is in any groups add them to the Group Members list
  const userGroups = await UserGroupModel.find({ user: user._id }).lean();
  if (!!userGroups && userGroups?.length > 0) {
    lists.push(ActiveCampaignListId.GroupMembers);
  }

  // if the user is a group admin, add them to the Group Admins list
  const admins = await UserGroupModel.find({ $and: [
    { user: user._id },
    { role: { $in: [UserGroupRole.Owner, UserGroupRole.Admin, UserGroupRole.SuperAdmin] } },
  ] }).lean();
  if (!!admins && admins?.length > 0) {
    lists.push(ActiveCampaignListId.GroupAdmins);
  }

  return lists;
};

const getBackfillSubscriptionLists = async (user: IUserDocument): Promise<ActiveCampaignListId[]> => addGroupSubscriptionsToLists(user, backfillSubscriberList);

const prepareSyncUsersRequest = async (
  users: Array<IUserDocument>,
  customFields: FieldIds,
  syncType: ActiveCampaignSyncTypes,
): Promise<IContactsImportData> => {
  // skip users with no email
  const contacts = await Promise.all(
    users.filter((user) => {
      if (user.emails) {
        const { email } = user.emails.find(e => e.primary);
        const isValid = isemail.validate(email, { minDomainAtoms: 2 });
        if (!isValid) {
          console.log('Skipping invalid email: ', email);
        }
        return isValid;
      }
      return false;
    }).map(async (user) => {
      const contact: IContactsData = {
        email: user.emails.find(e => e.primary).email.trim(),
      };
      let fields = await prepareInitialSyncFields(user, customFields, []);
      let subscribe: ActiveCampaignListId[] = [];
      let tags: string[] = [];
      contact.first_name = user.name?.split(' ')[0];
      contact.last_name = user.name?.split(' ').pop();

      switch (syncType) {
        case ActiveCampaignSyncTypes.DAILY:
          fields = await prepareDailyUpdatedFields(user, customFields, fields);
          break;
        case ActiveCampaignSyncTypes.WEEKLY:
          fields = await prepareWeeklyUpdatedFields(user, customFields, fields);
          break;
        case ActiveCampaignSyncTypes.MONTHLY:
          fields = await prepareMonthlyUpdatedFields(user, customFields, fields);
          break;
        case ActiveCampaignSyncTypes.QUARTERLY:
          fields = await prepareMonthlyUpdatedFields(user, customFields, fields);
          break;
        case ActiveCampaignSyncTypes.YEARLY:
          fields = await prepareYearlyUpdatedFields(user, customFields, fields);
          break;
        case ActiveCampaignSyncTypes.INITIAL:
          // this is always done
          break;
        case ActiveCampaignSyncTypes.BACKFILL:
          fields = await prepareBackfillSyncFields(user, customFields, fields);
          subscribe = await getBackfillSubscriptionLists(user);
          tags = await getUserGroups(user._id);
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

const syncAllUsers = async (syncType: ActiveCampaignSyncTypes) => {
  const ac = new ActiveCampaignClient();
  const customFields = await ac.getCustomFieldIDs();
  let users: IUserDocument[] = [];
  const currentUpdateDateTime = getUtcDate();
  const batchSize = 150;
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

    console.log(`Sending ${users.length} contacts to ActiveCampaign`);

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
};

const syncUserSubsrciptionsAndTags = async (userSubscriptions: UserSubscriptions[]) => {
  if (!userSubscriptions || userSubscriptions.length === 0) {
    throw new Error('No user subscriptions provided');
  }
  const ac = new ActiveCampaignClient();

  let userLists = await Promise.all(userSubscriptions.map(async (list) => ({
    email: (await UserModel.findById(list.userId))?.emails?.find(e => e.primary)?.email,
    userId: list.userId,
    lists: {
      subscribe: list.subscribe.map((sub: SubscriptionCode) => ({ listid: SubscriptionCodeToProviderProductId[sub] as ActiveCampaignListId })),
      unsubscribe: list.unsubscribe.map((unsub) => ({ listid: SubscriptionCodeToProviderProductId[unsub] as ActiveCampaignListId })),
    },
  })));

  userLists = userLists.filter((lists) => {
    if (!lists.email) {
      return false;
    }
    const isValid = isemail.validate(lists.email, { minDomainAtoms: 2 });
    if (!isValid) {
      console.log('Skipping invalid email: ', lists.email);
    }
    return isValid;
  });

  const maxBatchSize = 100;
  const msBetweenBatches = 2000;
  let firstItemInCurrentBatch = 0;
  let lastItemInCurrentBatch = userLists.length > maxBatchSize ? maxBatchSize - 1 : userLists.length - 1;
  let batchSize = userLists.length > maxBatchSize ? maxBatchSize : userLists.length;
  // loop over the batches
  const numBatches = Math.ceil(userLists.length / maxBatchSize);
  for (let i = 0; i < numBatches; i++) {
    console.log(`Preparing batch ${i + 1} of ${numBatches}`);
    const contacts = await prepareSubscriptionListsAndTags(userLists.slice(firstItemInCurrentBatch, lastItemInCurrentBatch + 1));

    console.log(`Sending ${batchSize} contacts to ActiveCampaign`);
    console.log(JSON.stringify(contacts, null, 2));
    await ac.importContacts(contacts);

    sleep(msBetweenBatches);

    batchSize = lastItemInCurrentBatch + maxBatchSize >= userLists.length ? userLists.length - lastItemInCurrentBatch : maxBatchSize;
    firstItemInCurrentBatch = lastItemInCurrentBatch + 1;
    lastItemInCurrentBatch += batchSize;
  }
};

export const exec = async ({ syncType, userSubscriptions }: IJobData) => {
  try {
    switch (syncType) {
      case ActiveCampaignSyncTypes.GROUP:
        await syncUserSubsrciptionsAndTags(userSubscriptions);
        break;
      default:
        await syncAllUsers(syncType);
    }

    console.log(`Starting ${syncType} sync`);
  } catch (err) {
    console.error(err);
  }
};
