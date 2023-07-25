/* eslint-disable camelcase */
import { FilterQuery, ObjectId } from 'mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CardModel, ICard, ICardDocument, IMarqetaIntegration } from '../../models/card';
import { IRequest } from '../../types/request';
import { IShareableUser, IUserDocument } from '../../models/user';
import { IRef } from '../../types/model';
import { getShareableUser } from '../user';
import { PlaidClient } from '../../clients/plaid';
import CustomError from '../../lib/customError';
import { CardStatus, ErrorTypes } from '../../lib/constants';

dayjs.extend(utc);

/*
  userId: IRef<ObjectId, IShareableUser>;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  status: CardStatus;
  institution: string;
  createdOn: Date;
  lastModified: Date;
*/
export interface IRemoveCardParams {
  card: IRef<ObjectId, ICard>;
}

export interface IRemoveCardBody {
  removeData: boolean;
}

export const getShareableCard = ({
  _id,
  userId,
  name,
  mask,
  type,
  subtype,
  status,
  institution,
  integrations,
  createdOn,
  lastModified,
  unlinkedDate,
  removedDate,
  initialTransactionsProcessing,
  lastTransactionSync,
}: ICardDocument) => {
  const _user: IRef<ObjectId, IShareableUser> = !!(userId as IUserDocument)?.name
    ? getShareableUser(userId as IUserDocument)
    : userId;

  return {
    _id,
    userId: _user,
    name,
    mask,
    type,
    subtype,
    status,
    institution,
    // TODO: remove this after instituation logos are hosted and
    // logo property is added to cards.
    institutionId: integrations?.plaid?.institutionId,
    integrations,
    createdOn,
    unlinkedDate,
    removedDate,
    lastModified,
    initialTransactionsProcessing,
    lastTransactionSync,
  };
};

export const _getCard = async (query: FilterQuery<ICard>) => CardModel.findOne(query);

export const _getCards = async (query: FilterQuery<ICard>) => CardModel.find(query);

export const _updateCards = async (query: FilterQuery<ICard>, updates: Partial<ICard>) => CardModel.updateMany(query, { ...updates, lastModified: dayjs().utc().toDate() });

// internal functions to handle cleanup for individual integrations
// when a user removes a card
const _removePlaidCard = async (requestor: IUserDocument, card: ICardDocument, removeData: boolean) => {
  const client = new PlaidClient();
  if (card?.integrations?.plaid?.accessToken) {
    await client.removeItem({ access_token: card.integrations.plaid.accessToken });
  }
  if (removeData) {
    // await TransactionModel.deleteMany({ user: requestor._id, card: card._id });
    // TODO: these jobs should ideally be broken down into jobs for users and jobs to get totals
    // currently we have to process all users and cards to get the totals and will need to run
    // after any user removes a card + transactions
    // MainBullClient.createJob(JobNames.GenerateUserTransactionTotals, {});
    // MainBullClient.createJob(JobNames.GenerateUserImpactTotals, {});
  }
  await CardModel.updateMany({ 'integrations.plaid.accessToken': card.integrations.plaid.accessToken }, {
    'integrations.plaid.accessToken': null,
    $push: { 'integrations.plaid.unlinkedAccessTokens': card.integrations.plaid.accessToken },
  });
};

const _removeRareCard = async (requestor: IUserDocument, card: ICardDocument, removeData: boolean) => {
  if (removeData) {
    // await TransactionModel.deleteMany({ user: requestor._id, card: card._id });
  }
};

export const removeCard = async (req: IRequest<IRemoveCardParams, {}, IRemoveCardBody>) => {
  const { card } = req.params;
  const { requestor } = req;

  if (!card) throw new CustomError('A card id is required', ErrorTypes.INVALID_ARG);

  const _card = await _getCard({ _id: card, user: requestor._id });
  if (!_card) throw new CustomError('A card with that id does not exist', ErrorTypes.NOT_FOUND);

  /** IMPORTANT
   * currently we will be taking remove data requests and handling them manually
   * until we decide how to handle the data associated with a card.
   * structure for handling the request will be left in for now as we decide how to move forward
   * Removing card and data will remove ALL transactions associated with the card
   * any generated reports and impact totals will be removed and possibly regenerated
   */
  const { removeData } = req.body;

  // splitting up the logic for specific integrations for scaling
  if (_card?.integrations?.plaid) {
    await _removePlaidCard(requestor, _card, removeData);
  }
  if (_card?.integrations?.rare) {
    await _removeRareCard(requestor, _card, removeData);
  }
  if (removeData) {
    // for all integrations, remove the card
    // await _card.delete();
  }

  _card.status = CardStatus.Removed;
  _card.removedDate = dayjs().utc().toDate();
  _card.lastModified = dayjs().utc().toDate();
  await _card.save();

  // Todo: is there other data needed in the response?
  return { message: `Card ${card} ${removeData ? 'and associated data' : ''} has been removed.` };
};

export const getCards = async (req: IRequest) => {
  const { requestor } = req;
  return _getCards({ $and: [{ status: { $nin: [CardStatus.Removed] } }, { userId: requestor._id }, { 'integrations.rare': null }] });
};

const extractYearAndMonth = (dateString:Date) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return { year, month };
};

export const addCards = async (cardData:IMarqetaIntegration) => {
  const { user_token, token, expiration_time } = cardData;
  console.log('cardData', cardData);
  if (!user_token) throw new CustomError('A user_token is required', ErrorTypes.INVALID_ARG);

  let card = await CardModel.findOne({ userId: user_token });
  if (!card) {
    // If the card document doesn't exist, you may choose to create a new one
    card = new CardModel({ userId: user_token, status: CardStatus.Linked });
  }
  // extract the expiration year & month of the card
  const { year, month } = extractYearAndMonth(expiration_time);

  // prepare the cardItem Details
  const cardItem = { card_token: token,
    expr_month: month,
    expr_year: year,
    ...cardData };

  // Update the Marqeta details in the integrations.marqeta field
  card.integrations.marqeta.push(cardItem);
  // Save the updated card document
  await card.save();
};
