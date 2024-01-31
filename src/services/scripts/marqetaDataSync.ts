/* eslint-disable no-restricted-syntax */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { TransactionModel as MarqetaTransactionModel } from '../../clients/marqeta/types';
import { getMarqetaResources } from '../../integrations/marqeta';
import { getCardsForUser } from '../../integrations/marqeta/card';
import { getPaginatedTransactionsForUser, getTransactions, mapAndSaveMarqetaTransactionsToKarmaTransactions } from '../../integrations/marqeta/transactions';
import { MarqetaCardModel, MarqetaCardState, MarqetaUserModel } from '../../integrations/marqeta/types';
import { getUsers } from '../../integrations/marqeta/user';
import { CardStatus } from '../../lib/constants';
import { extractYearAndMonth } from '../../lib/date';
import { encrypt } from '../../lib/encryption';
import { sleep } from '../../lib/misc';
import { CardModel, ICardDocument } from '../../models/card';
import { IUserDocument, UserModel } from '../../models/user';
import { getCardStatusFromMarqetaCardState } from '../card';

dayjs.extend(utc);

const SleepMS = 500; // delay between requests to avoid rate limiting

export interface IMarqetaTransactionReconciliationParams {
  startDate: Date;
  endDate: Date;
  filterExistingTransactions?: boolean;
  writeOutput?: boolean;
  accessTokens?: string[];
}

export const getTransactionsForUser = async (userId: string) => {
  const transactions = await getPaginatedTransactionsForUser(userId);
  await mapAndSaveMarqetaTransactionsToKarmaTransactions(transactions);
};

export const getPaginatedMarqetaCardsForUser = async (userToken: string): Promise<MarqetaCardModel[]> => {
  const cards = await getMarqetaResources(
    {
      sortBy: 'createdTime',
      userToken,
    },
    getCardsForUser,
  );
  return cards;
};

export const getPaginatedMarqetaUsers = async (): Promise<MarqetaUserModel[]> => {
  const users = await getMarqetaResources(
    {
      sortBy: 'createdTime',
    },
    getUsers,
  );
  return users;
};

export const getMarqetaTransactionsOnCardOverTimePeriod = async (
  userToken: string,
  cardToken: string,
  startDate: Date,
  endDate: Date,
): Promise<MarqetaTransactionModel[]> => {
  const transactions = await getMarqetaResources(
    {
      userToken,
      cardToken,
      startDate: dayjs(startDate).format('YYYY-MM-DD'),
      endDate: dayjs(endDate).format('YYYY-MM-DD'),
      sortBy: 'created_time',
    },
    getTransactions,
  );
  return transactions;
};

const getMarqetaCardsForUser = async (marqetaUserToken: string, verbose: boolean = false) => {
  const timeString = `fetching all marqeta cards for user: ${marqetaUserToken?.toString()}`;
  console.time(timeString);

  const cards = await getPaginatedMarqetaCardsForUser(marqetaUserToken);
  if (verbose) {
    console.log(`found ${cards.length} cards`);
  }
  console.timeEnd(timeString);
  return cards;
};

const getMarqetaUsers = async (verbose: boolean = false) => {
  const timeString = 'fetching all marqeta users';
  console.time(timeString);

  const users = await getPaginatedMarqetaUsers();
  if (verbose) {
    console.log(`found ${users.length} users`);
  }
  console.timeEnd(timeString);
  return users;
};

const getMarqetaTransactions = async (user: IUserDocument, startDate: Date, endDate: Date, verbose: boolean = false) => {
  if (!user?._id) {
    console.error(`no user provided for transaction lookup: ${user}`);
    return;
  }

  const timeString = `matching for user ${user._id?.toString()}`;
  console.time(timeString);

  if (user.isTestIdentity) {
    console.log(`skipping test user ${user._id}`);
    return;
  }
  if (!user?.integrations?.marqeta) {
    console.log('user does not have marqeta integration: ', JSON.stringify(user, null, 2));
    return;
  }

  const { userToken } = user.integrations.marqeta;
  // get all karma cards for user
  const cards = await CardModel.find({ userId: user._id, status: CardStatus.Linked, 'integrations.marqeta.card_token': { $exists: true } });
  const transactions: MarqetaTransactionModel[] = (
    await Promise.all(
      cards.map(async (card) => {
        const cardTransactions = await getMarqetaTransactionsOnCardOverTimePeriod(
          userToken,
          card.integrations.marqeta.card_token,
          startDate,
          endDate,
        );
        if (verbose) {
          console.log(`found ${cardTransactions.length} transactions for card ${card.integrations.marqeta.card_token}`);
        }
        return cardTransactions;
      }),
    )
  ).flat();

  // update last transaction sync
  for (const c of cards) {
    c.lastTransactionSync = dayjs().utc().toDate();
    await c.save();
  }
  return transactions;
};

export const marqetaTransactionSync = async ({ startDate, endDate }: IMarqetaTransactionReconciliationParams) => {
  const overallTimeString = `Marqeta transaction sync for ${dayjs().toISOString()}`;
  console.time(overallTimeString);
  console.log('\n');
  console.log(`marqeta transaction mapping started for ${dayjs().toISOString()}`);
  // loop through all users with marqeta integration

  const usersWithMarqetaIntegrations = await UserModel.find({ 'integrations.marqeta.userToken': { $exists: true } });

  for (const user of usersWithMarqetaIntegrations) {
    // catching errors here so that we can continue to loop through users
    try {
      console.log(`starting marqeta transaction sync for user ${user._id}`);
      const transactions = await getMarqetaTransactions(user, startDate, endDate);
      console.log(`found ${transactions.length} transactions for user ${user._id}`);
      if (!transactions) {
        throw new Error('error retrieving transactions');
      }
      const savedTransactions = await mapAndSaveMarqetaTransactionsToKarmaTransactions(transactions);
      console.log(`saved/updated ${savedTransactions.length} transactions for user ${user._id}`);
    } catch (err) {
      console.error(`error for user ${user._id}: ${err}`);
    }
    await sleep(SleepMS);
  }

  console.log('\n');
  console.timeEnd(overallTimeString);
  console.log('transaction sync complete');
  console.log('\n');
};

export const updateMarqetaCards = async (
  cards: MarqetaCardModel[],
  cardsWithMarqetaIntegrations: ICardDocument[],
): Promise<ICardDocument[]> => {
  try {
    return Promise.all(
      cards.map(async (card) => {
        console.log(`syncing card with marqeta card token: ${card.token}`);
        const existingCard = cardsWithMarqetaIntegrations.find(
          (c) => c.integrations.marqeta.card_token === card.token || c.integrations.marqeta.token === card.token,
        );
        if (!existingCard) {
          console.error(`Marqeta card with token: ${card.token} is missing from our database`);
          return null;
        }
        try {
          const { year, month } = extractYearAndMonth(new Date(card.expiration_time));
          existingCard.set({
            status: getCardStatusFromMarqetaCardState(card?.state as MarqetaCardState),
            lastModified: dayjs().utc().toDate(),
            'integrations.marqeta': {
              card_token: card.token,
              user_token: card?.user_token,
              card_product_token: card?.card_product_token,
              pan: encrypt(card?.pan),
              last_four: encrypt(card?.last_four),
              expr_month: month,
              expr_year: year,
              created_time: card?.created_time,
              pin_is_set: card?.pin_is_set,
              state: card?.state,
              fulfillment_status: card?.fulfillment_status,
              instrument_type: card?.instrument_type,
              barcode: card?.barcode,
            },
          });
          return existingCard.save();
        } catch (err) {
          console.error(`error saving user ${existingCard._id}: ${err}`);
          return null;
        }
      }),
    );
  } catch (err) {
    console.error(`error updating cards: ${err}`);
    return null;
  }
};

export const updateMarqetaUser = async (user: MarqetaUserModel, usersWithMarqetaIntegrations: IUserDocument[]) => {
  console.log(`syncing user with marqeta user token: ${user.token}`);
  const existingUser = usersWithMarqetaIntegrations.find((u) => u.integrations.marqeta.userToken === user.token);
  if (!existingUser) {
    console.error(`Marqeta user with token: ${user.token} is missing from our database`);
    return null;
  }
  try {
    // update the existing user with the marqeta user info
    const existingIntegration = existingUser?.integrations?.marqeta;
    const userDataToSet: any = {
      lastModified: dayjs().utc().toDate(),
      'integrations.marqeta': {
        userToken: user.token,
        kycResult: existingIntegration?.kycResult,
        email: user?.email,
        address1: user?.address1,
        first_name: user.first_name,
        last_name: user.last_name,
        birth_date: user.birth_date,
        city: user.city,
        state: user.state,
        country: user.country,
        postal_code: user.postal_code,
        account_holder_group_token: existingUser.integrations.marqeta.account_holder_group_token,
        identifications: existingUser.integrations.marqeta.identifications,
        status: user.status,
        created_time: user.created_time,
      },
    };

    if (!!user.address2) userDataToSet.address2 = user.address2;
    if (!!user.phone) userDataToSet.phone_number = user.phone;

    existingUser.set(userDataToSet);
    return existingUser.save();
  } catch (err) {
    console.error(`error saving user ${existingUser._id}: ${err}`);
    return null;
  }
};

export const marqetaUserSync = async () => {
  const overallTimeString = `Marqeta user sync on: ${dayjs().toISOString()}`;
  console.time(overallTimeString);
  console.log('\n');
  console.log(`marqeta user sync started for ${dayjs().toISOString()}`);

  // pull all users with marqeta integration
  const usersWithMarqetaIntegrations = await UserModel.find({ 'integrations.marqeta.userToken': { $exists: true } });
  if (!usersWithMarqetaIntegrations?.length) {
    throw new Error('error retrieving users with marqeta integration');
  }

  // get all our users from marqeta
  const marqetaUsers = await getMarqetaUsers();
  if (!marqetaUsers?.length) {
    throw new Error('error retrieving marqeta users');
  }

  // make sure each one is already in usersWithMarqetaIntegrations
  const savedUsers = (
    await Promise.all(marqetaUsers.map(async (marqetaUser) => updateMarqetaUser(marqetaUser, usersWithMarqetaIntegrations)))
  ).filter((u) => !!u);

  console.log(`saved/updated ${savedUsers.length} users`);

  console.log('\n');
  console.timeEnd(overallTimeString);
  console.log('user sync complete');
  console.log('\n');
};

export const marqetaCardSync = async () => {
  const overallTimeString = `Marqeta card sync for ${dayjs().toISOString()}`;
  console.time(overallTimeString);
  console.log('\n');
  console.log(`marqeta card sync started for ${dayjs().toISOString()}`);

  // pull all users with marqeta integration
  const usersWithMarqetaIntegrations = await UserModel.find({ 'integrations.marqeta.userToken': { $exists: true } });
  if (!usersWithMarqetaIntegrations?.length) {
    throw new Error('error retrieving users with marqeta integration');
  }

  const cardsWithMarqetaIntegration = await CardModel.find({
    $or: [{ 'integrations.marqeta.card_token': { $exists: true } }, { 'integrations.marqeta.token': { $exists: true } }],
  });
  if (!cardsWithMarqetaIntegration?.length) {
    throw new Error('error retrieving cards with marqeta integration');
  }

  // make sure each one is already in usersWithMarqetaIntegrations
  const savedCards: ICardDocument[][] = [];
  for (const marqetaUser of usersWithMarqetaIntegrations) {
    const marqetaCardsForUser = await getMarqetaCardsForUser(marqetaUser?.integrations?.marqeta?.userToken);
    if (!marqetaCardsForUser?.length) {
      throw new Error('error retrieving marqeta users');
    }
    savedCards.push(await updateMarqetaCards(marqetaCardsForUser, cardsWithMarqetaIntegration));
    await sleep(SleepMS);
  }
  const flattenedSavedCards = savedCards.flat().filter((c) => !!c);

  console.log(`saved/updated ${flattenedSavedCards.length} cards`);

  console.log('\n');
  console.timeEnd(overallTimeString);
  console.log('card sync complete');
  console.log('\n');
};
