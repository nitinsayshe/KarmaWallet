import { AxiosInstance } from 'axios';
import { SandboxedJob } from 'bullmq';
import dayjs from 'dayjs';
import isemail from 'isemail';
import { PaginateResult, Types } from 'mongoose';
import z, { SafeParseError } from 'zod';
import { ActiveCampaignClient, IContactsData, IContactsImportData } from '../clients/activeCampaign';
import {
  FieldIds,
  getUserGroups,
  prepareBackfillSyncFields,
  prepareCardSignupBackfillSync,
  prepareDailyUpdatedFields,
  prepareInitialSyncFields,
  prepareLinkedAccountFields,
  prepareMonthlyUpdatedFields,
  prepareWeeklyUpdatedFields,
  prepareYearlyUpdatedFields,
  removeDuplicateContactAutomations,
  UserLists,
  UserSubscriptions,
  prepareQuarterlyUpdatedFields,
  prepareBiweeklyUpdatedFields,
} from '../integrations/activecampaign';
import { ActiveCampaignCustomFields, ActiveCampaignSyncTypes } from '../lib/constants/activecampaign';
import { JobNames } from '../lib/constants/jobScheduler';
import { ProviderProductIdToSubscriptionCode, SubscriptionCodeToProviderProductId } from '../lib/constants/subscription';
import { roundToPercision, sleep } from '../lib/misc';
import { IUserDocument, UserModel } from '../models/user';
import {
  ArticleWithCompany,
  getArticleRecommendationsBasedOnTransactionHistory,
  getArticlesForCompany,
  getCompaniesWithArticles,
  URLs,
} from '../services/article/utils/recommendations';
import {
  getActiveCampaignSubscribedListIds,
  getNonActiveCampaignSubscriptions,
  getUserGroupSubscriptionsToUpdate,
  reconcileActiveCampaignListSubscriptions,
  updateNewKWCardUserSubscriptions,
  updateUserSubscriptions,
} from '../services/subscription';
import { iterateOverUsersAndExecWithDelay, UserIterationRequest, UserIterationResponse } from '../services/user/utils';
import {
  countUnlinkedAndRemovedAccounts,
  getMonthlyMissedCashBack,
  getTransactionBreakdownByCompanyRating,
  getUsersWithCommissionsLastMonth,
  getUsersWithCommissionsLastWeek,
  getWeeklyMissedCashBack,
} from '../services/user/utils/metrics';
import { ActiveCampaignListId, SubscriptionCode } from '../types/subscription';
import { IUser } from '../models/user/types';
import { DateKarmaMembershipStoppedbBeingFree } from '../lib/constants';

interface IJobData {
  syncType: ActiveCampaignSyncTypes;
  userSubscriptions?: UserSubscriptions[];
  httpClient?: AxiosInstance;
  cardSignupUserId?: string;
}

interface ISubscriptionLists {
  subscribe: ActiveCampaignListId[];
  unsubscribe: ActiveCampaignListId[];
}

export type ArticleRecommedationsCustomFields = {
  startDate: Date;
  endDate: Date;
  articlesByCompany: ArticleWithCompany[][];
};

export type SpendingAnalysisCustomFields = {};
export type SyncAllUsersCustomFields = {
  syncType: ActiveCampaignSyncTypes;
};

export type CashbackSimulationCustomFields = {
  missingCashbackThresholdDollars: number;
};

const backfillSubscribeList = [ActiveCampaignListId.GeneralUpdates, ActiveCampaignListId.AccountUpdates];

const getGroupSubscriptionListsToUpdate = async (user: IUserDocument): Promise<ISubscriptionLists> => {
  try {
    const subs = await getUserGroupSubscriptionsToUpdate(user);
    return {
      subscribe: subs?.subscribe?.map((code) => SubscriptionCodeToProviderProductId[code] as ActiveCampaignListId),
      unsubscribe: subs?.unsubscribe?.map((code) => SubscriptionCodeToProviderProductId[code] as ActiveCampaignListId),
    };
  } catch (err) {
    console.error('Error getting group subscriptions to update', err);
    return { subscribe: [], unsubscribe: [] };
  }
};

const getBackfillSubscriptionLists = async (user: IUserDocument): Promise<ISubscriptionLists> => getGroupSubscriptionListsToUpdate(user);

const iterateOverUsersAndExecImportReqWithDelay = async <T>(
  request: UserIterationRequest<T>,
  prepareBulkImportRequest: (
    req: UserIterationRequest<T>,
    userBatch: PaginateResult<IUser>,
    customFields: { name: string; id: number }[]
  ) => Promise<IContactsImportData>,
  msDelayBetweenBatches: number,
) => {
  const ac = new ActiveCampaignClient();
  ac.withHttpClient(request?.httpClient);
  const customFields = await ac.getCustomFieldIDs();

  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const userBatch = await UserModel.paginate(request.batchQuery, {
      page,
      limit: request.batchLimit,
    });

    console.log('total users matching query: ', userBatch.totalDocs);
    console.log(`Preparing batch ${page} of ${userBatch.totalPages}`);
    const contacts = await prepareBulkImportRequest(request, userBatch, customFields);

    if (contacts?.contacts?.length > 0) {
      console.log(`Sending ${contacts.contacts.length} contacts to ActiveCampaign`);
      console.log('contacts: ', JSON.stringify(contacts));
      await ac.importContacts(contacts);
    }

    await sleep(msDelayBetweenBatches);

    hasNextPage = userBatch?.hasNextPage || false;
    page++;
  }
};

const prepareSyncUsersRequest = async (
  req: UserIterationRequest<SyncAllUsersCustomFields>,
  userBatch: PaginateResult<IUser>,
  customFields: FieldIds,
): Promise<IContactsImportData> => {
  // skip users with no email
  const contacts = await Promise.all(
    userBatch.docs
      .filter((user) => {
        if (user.emails) {
          const { email } = user.emails.find((e) => e.primary);
          const isValid = isemail.validate(email, { minDomainAtoms: 2 });
          if (!isValid) {
            console.log('Skipping invalid email: ', email);
            return false;
          }
          return isValid;
        }
        return false;
      })
      .map(async (user) => {
        const contact: IContactsData = {
          email: user.emails.find((e) => e.primary).email.trim(),
        };
        const userDocument = user as IUserDocument;
        let fields = await prepareInitialSyncFields(userDocument, customFields, []);
        let tags: string[] = [];
        let lists: ISubscriptionLists = { subscribe: [], unsubscribe: [] };

        const name = userDocument.name?.replace(/\s/g, ' ');
        contact.first_name = name?.split(' ')[0];
        contact.last_name = name?.split(' ').pop();

        switch (req.fields?.syncType) {
          case ActiveCampaignSyncTypes.DAILY:
            fields = await prepareDailyUpdatedFields(userDocument, customFields, fields);
            break;
          case ActiveCampaignSyncTypes.WEEKLY:
            fields = await prepareWeeklyUpdatedFields(userDocument, customFields, fields);
            break;
          case ActiveCampaignSyncTypes.BIWEEKLY:
            fields = await prepareBiweeklyUpdatedFields(userDocument, customFields, fields);
            break;
          case ActiveCampaignSyncTypes.MONTHLY:
            fields = await prepareMonthlyUpdatedFields(userDocument, customFields, fields);
            break;
          case ActiveCampaignSyncTypes.QUARTERLY:
            fields = await prepareQuarterlyUpdatedFields(userDocument, customFields, fields);
            break;
          case ActiveCampaignSyncTypes.YEARLY:
            fields = await prepareYearlyUpdatedFields(userDocument, customFields, fields);
            break;
          case ActiveCampaignSyncTypes.LINKED_ACCOUNTS:
            fields = await prepareLinkedAccountFields(userDocument, customFields, fields);
            break;
          case ActiveCampaignSyncTypes.CARD_SIGNUP_BACKFILL:
            fields = await prepareCardSignupBackfillSync(userDocument, customFields, fields);
            break;
          case ActiveCampaignSyncTypes.BACKFILL:
            fields = await prepareBackfillSyncFields(userDocument, customFields, fields);
            lists = await getBackfillSubscriptionLists(userDocument);
            lists.subscribe = lists?.subscribe?.concat(backfillSubscribeList);
            tags = await getUserGroups(userDocument._id);
            break;
          default:
            console.error('Invalid sync type');
            break;
        }
        contact.fields = fields;
        contact.subscribe = lists.subscribe.map((listId: ActiveCampaignListId) => ({ listid: listId }));
        contact.unsubscribe = lists.unsubscribe.map((listId: ActiveCampaignListId) => ({ listid: listId }));
        contact.tags = tags;
        await updateUserSubscriptions(
          userDocument._id,
          lists.subscribe.map((id: ActiveCampaignListId) => ProviderProductIdToSubscriptionCode[id]),
          lists.unsubscribe.map((id: ActiveCampaignListId) => ProviderProductIdToSubscriptionCode[id]),
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

const syncAllUsers = async (syncType: ActiveCampaignSyncTypes, httpClient: AxiosInstance) => {
  const msDelayBetweenBatches = 1500;
  const req: UserIterationRequest<SyncAllUsersCustomFields> = {
    httpClient,
    batchQuery: {},
    batchLimit: 150,
    fields: { syncType },
  };

  await iterateOverUsersAndExecImportReqWithDelay(req, prepareSyncUsersRequest, msDelayBetweenBatches);
};

export const prepareSubscriptionListsAndTags = async (userLists: UserLists[]): Promise<IContactsImportData> => {
  const contacts = await Promise.all(
    userLists.map(async (list) => {
      const contact: IContactsData = {
        email: list.email,
        subscribe: list.lists.subscribe,
        unsubscribe: list.lists.unsubscribe,
        tags: await getUserGroups(list.userId),
      };
      return contact;
    }),
  );
  return { contacts };
};

const syncUserSubsrciptionsAndTags = async (userSubscriptions: UserSubscriptions[], httpClient: AxiosInstance) => {
  if (!userSubscriptions || userSubscriptions.length === 0) {
    return; // nothing to do
  }
  const ac = new ActiveCampaignClient();
  ac.withHttpClient(httpClient);

  let userLists = await Promise.all(
    userSubscriptions.map(async (list) => ({
      email: (await UserModel.findById(list.userId))?.emails?.find((e) => e.primary)?.email,
      userId: list.userId,
      lists: {
        subscribe: list.subscribe.map((sub: SubscriptionCode) => ({
          listid: SubscriptionCodeToProviderProductId[sub] as ActiveCampaignListId,
        })),
        unsubscribe: list.unsubscribe.map((unsub) => ({
          listid: SubscriptionCodeToProviderProductId[unsub] as ActiveCampaignListId,
        })),
      },
    })),
  );

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
  const msBetweenBatches = 1500;
  let firstItemInCurrentBatch = 0;
  let lastItemInCurrentBatch = userLists.length > maxBatchSize ? maxBatchSize - 1 : userLists.length - 1;
  let batchSize = userLists.length > maxBatchSize ? maxBatchSize : userLists.length;
  // loop over the batches
  const numBatches = Math.ceil(userLists.length / maxBatchSize);
  for (let i = 0; i < numBatches; i++) {
    console.log(`Preparing batch ${i + 1} of ${numBatches}`);
    const currBatch = userLists.slice(firstItemInCurrentBatch, lastItemInCurrentBatch + 1);
    const contacts = await prepareSubscriptionListsAndTags(currBatch);

    console.log(`Sending ${batchSize} contacts to ActiveCampaign`);
    console.log(JSON.stringify(contacts, null, 2));
    await ac.importContacts(contacts);

    // log subscriptions in db
    await Promise.all(
      currBatch.map(async (user) => updateUserSubscriptions(
        user.userId,
        user.lists.subscribe.map((id) => ProviderProductIdToSubscriptionCode[id.listid]),
        user.lists.unsubscribe.map((id) => ProviderProductIdToSubscriptionCode[id.listid]),
      )),
    );

    await sleep(msBetweenBatches);

    batchSize = lastItemInCurrentBatch + maxBatchSize >= userLists.length ? userLists.length - lastItemInCurrentBatch : maxBatchSize;
    firstItemInCurrentBatch = lastItemInCurrentBatch + 1;
    lastItemInCurrentBatch += batchSize;
  }
};

const prepareMonthlyCashbackSimulationImportRequest = async (
  request: UserIterationRequest<CashbackSimulationCustomFields>,
  userBatch: PaginateResult<IUser>,
  customFields: { name: string; id: number }[],
): Promise<IContactsImportData> => {
  let missedCashbackMetrics = await Promise.all(
    userBatch?.docs?.map(async (user) => getMonthlyMissedCashBack(user as unknown as IUserDocument)),
  );
  const emailSchema = z.string().email();
  missedCashbackMetrics = missedCashbackMetrics?.filter((metric) => {
    const validationResult = emailSchema.safeParse(metric.email);
    return !!metric.email && !(validationResult as SafeParseError<string>)?.error;
  });

  // set any that have a total below the threshold to 0 and round amount
  missedCashbackMetrics = missedCashbackMetrics?.map((metric) => {
    const { id, email, estimatedMonthlyMissedCommissionsAmount, estimatedMonthlyMissedCommissionsCount, estimatedMissedCashbackCompanies } = metric;
    if (estimatedMonthlyMissedCommissionsAmount <= request.fields.missingCashbackThresholdDollars) {
      return {
        id,
        email,
        estimatedMonthlyMissedCommissionsAmount: 0,
        estimatedMonthlyMissedCommissionsCount: 0,
        estimatedMissedCashbackCompanies: [],
      };
    }
    return {
      id,
      email,
      estimatedMonthlyMissedCommissionsAmount: roundToPercision(estimatedMonthlyMissedCommissionsAmount, 0),
      estimatedMonthlyMissedCommissionsCount,
      estimatedMissedCashbackCompanies,
    };
  });

  // set the custom fields and update in active campaign
  const missedDollarsFieldId = customFields.find((field) => field.name === ActiveCampaignCustomFields.missedCashbackDollarsLastMonth);
  const missedCashbackTransactionCountFieldId = customFields.find(
    (field) => field.name === ActiveCampaignCustomFields.missedCashbackTransactionNumberLastMonth,
  );
  const missedCashbackCompaniesFieldId = customFields.find(
    (field) => field.name === ActiveCampaignCustomFields.missedCashbackCompaniesLastMonth,
  );

  const contacts = missedCashbackMetrics.map((metric) => {
    const contact: IContactsData = {
      email: metric.email,
      fields: [],
    };
    if (!!missedDollarsFieldId) {
      contact.fields.push({
        id: missedDollarsFieldId.id,
        value: metric.estimatedMonthlyMissedCommissionsAmount.toString(),
      });
    }
    if (!!missedCashbackTransactionCountFieldId) {
      contact.fields.push({
        id: missedCashbackTransactionCountFieldId.id,
        value: metric.estimatedMonthlyMissedCommissionsCount.toString(),
      });
    }

    if (!!missedCashbackCompaniesFieldId) {
      contact.fields.push({
        id: missedCashbackCompaniesFieldId.id,
        value: metric.estimatedMissedCashbackCompanies.join('||'),
      });
    }

    return contact;
  });

  return { contacts };
};

const prepareWeeklyCashbackSimulationImportRequest = async (
  request: UserIterationRequest<CashbackSimulationCustomFields>,
  userBatch: PaginateResult<IUser>,
  customFields: { name: string; id: number }[],
): Promise<IContactsImportData> => {
  let missedCashbackMetrics = await Promise.all(
    userBatch?.docs?.map(async (user) => getWeeklyMissedCashBack(user as unknown as IUserDocument)),
  );
  const emailSchema = z.string().email();
  missedCashbackMetrics = missedCashbackMetrics?.filter((metric) => {
    const validationResult = emailSchema.safeParse(metric.email);
    return !!metric.email && !(validationResult as SafeParseError<string>)?.error;
  });

  // set any that have a total below the threshold to 0 and round amount
  missedCashbackMetrics = missedCashbackMetrics?.map((metric) => {
    const { id, email, estimatedWeeklyMissedCommissionsAmount, estimatedWeeklyMissedCommissionsCount } = metric;
    if (estimatedWeeklyMissedCommissionsAmount <= request.fields.missingCashbackThresholdDollars) {
      return {
        id,
        email,
        estimatedWeeklyMissedCommissionsAmount: 0,
        estimatedWeeklyMissedCommissionsCount: 0,
      };
    }
    return {
      id,
      email,
      estimatedWeeklyMissedCommissionsAmount: roundToPercision(estimatedWeeklyMissedCommissionsAmount, 0),
      estimatedWeeklyMissedCommissionsCount,
    };
  });

  // set the custom fields and update in active campaign
  const missedDollarsFieldId = customFields.find((field) => field.name === ActiveCampaignCustomFields.missedCashbackDollarsLastWeek);
  const missedCashbackTransactionCountFieldId = customFields.find(
    (field) => field.name === ActiveCampaignCustomFields.missedCashbackTransactionNumberLastWeek,
  );

  const contacts = missedCashbackMetrics.map((metric) => {
    const contact: IContactsData = {
      email: metric.email,
      fields: [],
    };
    if (!!missedDollarsFieldId) {
      contact.fields.push({
        id: missedDollarsFieldId.id,
        value: metric.estimatedWeeklyMissedCommissionsAmount.toString(),
      });
    }
    if (!!missedCashbackTransactionCountFieldId) {
      contact.fields.push({
        id: missedCashbackTransactionCountFieldId.id,
        value: metric.estimatedWeeklyMissedCommissionsCount.toString(),
      });
    }
    return contact;
  });

  return { contacts };
};
const syncEstimatedCashbackFieldsWeekly = async (httpClient?: AxiosInstance) => {
  // filter out users with commissions this month
  const usersWithCommissionsLastWeek = await getUsersWithCommissionsLastWeek();

  const msDelayBetweenBatches = 2000;

  const req: UserIterationRequest<CashbackSimulationCustomFields> = {
    httpClient,
    batchQuery: {
      _id: { $nin: usersWithCommissionsLastWeek },
    },
    batchLimit: 100,
    fields: {
      missingCashbackThresholdDollars: 2,
    },
  };

  await iterateOverUsersAndExecImportReqWithDelay(req, prepareWeeklyCashbackSimulationImportRequest, msDelayBetweenBatches);
};

const syncEstimatedCashbackFieldsMonthly = async (httpClient?: AxiosInstance) => {
  // filter out users with commissions this month
  const usersWithCommissionsLastMonth = await getUsersWithCommissionsLastMonth();

  const msDelayBetweenBatches = 2000;

  const req: UserIterationRequest<CashbackSimulationCustomFields> = {
    httpClient,
    batchQuery: { _id: { $nin: usersWithCommissionsLastMonth } },
    batchLimit: 100,
    fields: {
      missingCashbackThresholdDollars: 2,
    },
  };

  await iterateOverUsersAndExecImportReqWithDelay(req, prepareMonthlyCashbackSimulationImportRequest, msDelayBetweenBatches);
};

const prepareSpendingAnalysisImportRequest = async (
  _: UserIterationRequest<SpendingAnalysisCustomFields>,
  userBatch: PaginateResult<IUser>,
  customFields: { name: string; id: number }[],
): Promise<IContactsImportData> => {
  let spendingAnalysisMetrics: {
    email: string;
    numPositivePurchasesLastThirtyDays: number;
    positivePurchaseDollarsLastThirtyDays: number;
    numNegativePurchasesLastThirtyDays: number;
    negativePurchaseDollarsLastThirtyDays: number;
  }[] = await Promise.all(userBatch?.docs?.map(async (user) => getTransactionBreakdownByCompanyRating(user as unknown as IUserDocument)));
  const emailSchema = z.string().email();
  spendingAnalysisMetrics = spendingAnalysisMetrics?.filter((metric) => {
    const validationResult = emailSchema.safeParse(metric.email);
    return !!metric.email && !(validationResult as SafeParseError<string>)?.error;
  });

  // set the custom fields and update in active campaign
  const numPositivePurchasesLastThirtyDays = customFields.find(
    (field) => field.name === ActiveCampaignCustomFields.numPositivePurchasesLastThirtyDays,
  );
  const positivePurchaseDollarsLastThirtyDays = customFields.find(
    (field) => field.name === ActiveCampaignCustomFields.positivePurchaseDollarsLastThirtyDays,
  );
  const numNegativePurchasesLastThirtyDays = customFields.find(
    (field) => field.name === ActiveCampaignCustomFields.numNegativePurchasesLastThirtyDays,
  );
  const negativePurchaseDollarsLastThirtyDays = customFields.find(
    (field) => field.name === ActiveCampaignCustomFields.negativePurchaseDollarsLastThirtyDays,
  );

  const contacts = spendingAnalysisMetrics.map((metric) => {
    const contact: IContactsData = {
      email: metric.email,
      fields: [],
    };
    if (!!numPositivePurchasesLastThirtyDays) {
      contact.fields.push({
        id: numPositivePurchasesLastThirtyDays.id,
        value: metric.numPositivePurchasesLastThirtyDays.toString(),
      });
    }
    if (!!positivePurchaseDollarsLastThirtyDays) {
      contact.fields.push({
        id: positivePurchaseDollarsLastThirtyDays.id,
        value: metric.positivePurchaseDollarsLastThirtyDays.toString(),
      });
    }
    if (!!numNegativePurchasesLastThirtyDays) {
      contact.fields.push({
        id: numNegativePurchasesLastThirtyDays.id,
        value: metric.numNegativePurchasesLastThirtyDays.toString(),
      });
    }
    if (!!negativePurchaseDollarsLastThirtyDays) {
      contact.fields.push({
        id: negativePurchaseDollarsLastThirtyDays.id,
        value: metric.negativePurchaseDollarsLastThirtyDays.toString(),
      });
    }

    return contact;
  });

  return { contacts };
};

const syncSpendingAnalysisFields = async (httpClient?: AxiosInstance) => {
  const msDelayBetweenBatches = 2000;

  const req: UserIterationRequest<{}> = {
    httpClient,
    batchQuery: {},
    batchLimit: 100,
  };

  await iterateOverUsersAndExecImportReqWithDelay(req, prepareSpendingAnalysisImportRequest, msDelayBetweenBatches);
};

const prepareRemovedOrUnlinkedAccountsSyncRequest = async (
  _: UserIterationRequest<SpendingAnalysisCustomFields>,
  userBatch: PaginateResult<IUser>,
  customFields: { name: string; id: number }[],
): Promise<IContactsImportData> => {
  let UnlinkedAndRemovedAccountMetrics: {
    email: string;
    unlinkedCardsPastThirtyDays: number;
    removedCardsPastThirtyDays: number;
  }[] = await Promise.all(userBatch?.docs?.map(async (user) => countUnlinkedAndRemovedAccounts(user as unknown as IUserDocument)));
  const emailSchema = z.string().email();
  UnlinkedAndRemovedAccountMetrics = UnlinkedAndRemovedAccountMetrics?.filter((metric) => {
    const validationResult = emailSchema.safeParse(metric.email);
    return !!metric.email && !(validationResult as SafeParseError<string>)?.error;
  });

  // set the custom fields and update in active campaign
  const unlinkedCardsPastThirtyDays = customFields.find(
    (field) => field.name === ActiveCampaignCustomFields.unlinkedAccountsPastThirtyDays,
  );
  const removedCardsLastThirtyDays = customFields.find((field) => field.name === ActiveCampaignCustomFields.removedAccountsPastThirtyDays);

  const contacts = UnlinkedAndRemovedAccountMetrics.map((metric) => {
    const contact: IContactsData = {
      email: metric.email,
      fields: [],
    };
    if (!!unlinkedCardsPastThirtyDays) {
      contact.fields.push({
        id: unlinkedCardsPastThirtyDays.id,
        value: metric.unlinkedCardsPastThirtyDays.toString(),
      });
    }
    if (!!removedCardsLastThirtyDays) {
      contact.fields.push({
        id: removedCardsLastThirtyDays.id,
        value: metric.removedCardsPastThirtyDays.toString(),
      });
    }

    return contact;
  });

  return { contacts };
};

const prepareArticleRecommendationSyncRequest = async (
  req: UserIterationRequest<ArticleRecommedationsCustomFields>,
  userBatch: PaginateResult<IUser>,
  customFields: { name: string; id: number }[],
): Promise<IContactsImportData> => {
  let articleRecommendationData: { email: string; urls: URLs }[] = await Promise.all(
    userBatch?.docs?.map(async (user) => {
      const email = user?.emails?.find((e) => e.primary)?.email;
      const urls = await getArticleRecommendationsBasedOnTransactionHistory(
        user as unknown as IUserDocument,
        req.fields.startDate,
        req.fields.endDate,
        req.fields.articlesByCompany,
      );
      return { urls, email };
    }),
  );

  const emailSchema = z.string().email();
  articleRecommendationData = articleRecommendationData?.filter((data) => {
    const validationResult = emailSchema.safeParse(data?.email);
    return !!data.email && !(validationResult as SafeParseError<string>)?.error;
  });

  // set the custom fields and update in active campaign
  const recommendedArticles = customFields.find((field) => field.name === ActiveCampaignCustomFields.recommendedArticles);

  if (!recommendedArticles) {
    return { contacts: [] };
  }

  const contacts = articleRecommendationData.map((d) => {
    const contact: IContactsData = {
      email: d.email,
      fields: [
        {
          id: recommendedArticles?.id,
          value: !!d.urls?.length ? d.urls.join('||') : '',
        },
      ],
    };

    return contact;
  });

  return { contacts };
};

const prepareKarmaCardMembershipTypeSyncRequest = async (
  req: UserIterationRequest<ArticleRecommedationsCustomFields>,
  userBatch: PaginateResult<IUser>,
  customFields: { name: string; id: number }[],
): Promise<IContactsImportData> => {
  let membershipTypeData: { email: string; isFreeMembershipUser: boolean }[] = await Promise.all(
    userBatch?.docs?.map(async (user) => {
      const email = user?.emails?.find((e) => e.primary)?.email;
      const isFreeMembershipUser = !!user?.integrations?.marqeta?.created_time
        ? dayjs(user.integrations.marqeta.created_time).isBefore(DateKarmaMembershipStoppedbBeingFree)
        : false;

      return { email, isFreeMembershipUser };
    }),
  );

  const emailSchema = z.string().email();
  membershipTypeData = membershipTypeData?.filter((data) => {
    const validationResult = emailSchema.safeParse(data?.email);
    return !!data.email && !(validationResult as SafeParseError<string>)?.error;
  });

  // set the custom fields and update in active campaign
  const isFreeMembershipUser = customFields.find((field) => field.name === ActiveCampaignCustomFields.isFreeMembershipUser);

  if (!isFreeMembershipUser) {
    return { contacts: [] };
  }

  const contacts = membershipTypeData.map((d) => {
    const contact: IContactsData = {
      email: d.email,
      fields: [
        {
          id: isFreeMembershipUser?.id,
          value: d.isFreeMembershipUser.toString(),
        },
      ],
    };

    return contact;
  });

  console.log(JSON.stringify(contacts, null, 2));
  return { contacts };
};

const syncUnlinkedAndRemovedAccountsFields = async (httpClient?: AxiosInstance) => {
  const msDelayBetweenBatches = 2000;

  const req: UserIterationRequest<{}> = {
    httpClient,
    batchQuery: {},
    batchLimit: 100,
  };

  await iterateOverUsersAndExecImportReqWithDelay(req, prepareRemovedOrUnlinkedAccountsSyncRequest, msDelayBetweenBatches);
};

const reconcileUserSubscriptions = async (httpClient?: AxiosInstance) => {
  const msDelayBetweenBatches = 2000;

  const req: UserIterationRequest<{}> = {
    httpClient,
    batchQuery: {},
    batchLimit: 100,
  };

  await iterateOverUsersAndExecWithDelay(
    req,
    async (_: UserIterationRequest<{}>, userBatch: PaginateResult<IUserDocument>): Promise<UserIterationResponse<{}>[]> => {
      await Promise.all(
        userBatch.docs.map(async (user: IUserDocument) => {
          const email = user?.emails?.find((e) => e.primary)?.email;
          console.log(`Reconciling Active Campaign List Subscriptions for ${user._id}, ${email}`);
          try {
            // get active campaign subscrtiptions for this email
            const activeCampaignListIds = await getActiveCampaignSubscribedListIds(email);
            // add ids of any active subs not from active campaign
            const nonActiveCampaignSubs = await getNonActiveCampaignSubscriptions(user._id as unknown as Types.ObjectId);
            // update db with active campaign subscriptions
            await reconcileActiveCampaignListSubscriptions(
              new Types.ObjectId(user._id.toString()),
              activeCampaignListIds,
              nonActiveCampaignSubs,
            );
          } catch (err) {
            console.error(`Error reconciling list subscriptions for user: ${err}`);
          }
        }),
      );

      return userBatch.docs.map((user: IUserDocument) => ({
        userId: user._id,
      }));
    },
    msDelayBetweenBatches,
  );
};

const syncArticleRecommendationFields = async (httpClient?: AxiosInstance) => {
  const msDelayBetweenBatches = 2000;

  // take companies with articles as a param
  const companiesWithArticles = await getCompaniesWithArticles();

  // each element in the array holds the articles for a given company
  const articlesByCompany: ArticleWithCompany[][] = await Promise.all(
    companiesWithArticles.map(async (company) => getArticlesForCompany(company)),
  );

  const req: UserIterationRequest<ArticleRecommedationsCustomFields> = {
    httpClient,
    batchQuery: {},
    batchLimit: 100,
    fields: {
      startDate: dayjs().subtract(1, 'week').toDate(),
      endDate: dayjs().toDate(),
      articlesByCompany,
    },
  };

  await iterateOverUsersAndExecImportReqWithDelay(req, prepareArticleRecommendationSyncRequest, msDelayBetweenBatches);
};

const syncKarmaCardMembershipTypeFields = async (httpClient?: AxiosInstance) => {
  const msDelayBetweenBatches = 2000;

  const req: UserIterationRequest<undefined> = {
    httpClient,
    batchQuery: {},
    batchLimit: 100,
  };

  await iterateOverUsersAndExecImportReqWithDelay(req, prepareKarmaCardMembershipTypeSyncRequest, msDelayBetweenBatches);
};

export const removeDuplicateAutomationEnrollmentsFromAllUsers = async (httpClient?: AxiosInstance) => {
  const msDelayBetweenBatches = 2000;
  const batchLimit = 10;
  const emailSchema = z.string().email();

  const ac = new ActiveCampaignClient();
  ac.withHttpClient(httpClient);

  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    try {
      console.log(`fetching page ${page} of users`);
      const userBatch = await UserModel.paginate(
        {},
        {
          page,
          limit: batchLimit,
        },
      );

      console.log(`Working on batch ${page} of ${userBatch.totalPages}`);
      await Promise.all(
        userBatch.docs.map(async (user) => {
          const email = user?.emails?.find((e) => e.primary)?.email;
          const validationResult = emailSchema.safeParse(email);
          if (!(validationResult as SafeParseError<string>)?.error) {
            return null;
          }
          await removeDuplicateContactAutomations(email);
        }),
      );
      console.log(`Processed ${userBatch.docs.length} contacts`);
      console.log('users:');
      console.log(JSON.stringify(userBatch, null, 2));

      await sleep(msDelayBetweenBatches);

      hasNextPage = userBatch?.hasNextPage || false;
      page = userBatch?.nextPage;
    } catch (e) {
      console.log(e);
      hasNextPage = false;
      continue;
    }
  }
};

export const cardSignupSync = async (cardSignupUserId: string, httpClient?: AxiosInstance) => {
  const user = await UserModel.findById(cardSignupUserId);
  await updateNewKWCardUserSubscriptions(user, httpClient);
};

export const exec = async ({ syncType, userSubscriptions, cardSignupUserId, httpClient }: IJobData) => {
  try {
    console.log(`Starting ${syncType} sync`);
    switch (syncType) {
      case ActiveCampaignSyncTypes.GROUP:
        if (!userSubscriptions) {
          console.error('No user subscriptions provided');
          return;
        }
        await syncUserSubsrciptionsAndTags(userSubscriptions, httpClient);
        break;
      case ActiveCampaignSyncTypes.CARD_SIGNUP:
        if (!cardSignupUserId) {
          console.error('No card signup user id provided');
          return;
        }
        await cardSignupSync(cardSignupUserId, httpClient);
        break;
      case ActiveCampaignSyncTypes.CASHBACK_SIMULATION:
        await syncEstimatedCashbackFieldsMonthly(httpClient);
        break;
      case ActiveCampaignSyncTypes.CASHBACK_SIMULATION_WEEKLY:
        await syncEstimatedCashbackFieldsWeekly(httpClient);
        break;
      case ActiveCampaignSyncTypes.REMOVE_DUPLICATE_CONTACT_AUTOMAITONS:
        await removeDuplicateAutomationEnrollmentsFromAllUsers(httpClient);
        break;
      case ActiveCampaignSyncTypes.SPENDING_ANALYSIS:
        await syncSpendingAnalysisFields(httpClient);
        break;
      case ActiveCampaignSyncTypes.UNLINKED_AND_REMOVED_ACCOUNTS:
        await syncUnlinkedAndRemovedAccountsFields(httpClient);
        break;
      case ActiveCampaignSyncTypes.RECONCILE_SUBSCRIPTIONS:
        await reconcileUserSubscriptions(httpClient);
        break;
      case ActiveCampaignSyncTypes.ARTICLE_RECOMMENDATION:
        await syncArticleRecommendationFields(httpClient);
        break;
      case ActiveCampaignSyncTypes.KARMA_CARD_MEMBERSHIP_TYPE:
        await syncKarmaCardMembershipTypeFields(httpClient);
        break;
      default:
        await syncAllUsers(syncType, httpClient);
    }
    console.log(`Completed ${syncType} sync`);
  } catch (err) {
    console.error(err);
  }
};
