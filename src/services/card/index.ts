/* eslint-disable camelcase */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { isValidObjectId, FilterQuery, ObjectId } from 'mongoose';
import { SafeParseError, z, ZodError } from 'zod';
import { PlaidClient } from '../../clients/plaid';
import { createKardUserAndAddIntegrations, deleteKardUserForCard } from '../../integrations/kard';
import { CardStatus, ErrorTypes, KardEnrollmentStatus } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { encrypt } from '../../lib/encryption';
import { formatZodFieldErrors } from '../../lib/validation';
import { CardModel, ICard, ICardDocument, IShareableCard, IMarqetaCardIntegration } from '../../models/card';
import { IShareableUser, IUserDocument, UserModel } from '../../models/user';
import { IRef } from '../../types/model';
import { IRequest } from '../../types/request';
import { getShareableUser } from '../user';
import { getNetworkFromBin } from './utils';
import { extractYearAndMonth } from '../../lib/date';

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

export type KardRewardsParams = {
  card: IRef<ObjectId, ICard>;
};

export type KardRewardsRegisterRequest = {
  lastFour: string;
  bin: string;
};

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
}: ICardDocument): IShareableCard & { _id: string } => {
  console.log('incoming card', JSON.stringify({ _id, userId, name, mask, type, subtype, status, institution, integrations, createdOn, lastModified, unlinkedDate, removedDate, initialTransactionsProcessing, lastTransactionSync }, null, 2));
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
    isEnrolledInAutomaticRewards: !!integrations?.kard?.userId,
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

  await CardModel.updateMany(
    { 'integrations.plaid.accessToken': card.integrations.plaid.accessToken },
    {
      'integrations.plaid.accessToken': null,
      $push: { 'integrations.plaid.unlinkedAccessTokens': card.integrations.plaid.accessToken },
    },
  );
};

const _removeKardUser = async (card: ICardDocument): Promise<void> => {
  await deleteKardUserForCard(card);
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
  if (_card?.integrations?.kard) {
    // removing the kard user here since we create a new user for each linked card
    await _removeKardUser(_card);
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
  return _getCards({
    $and: [{ status: { $nin: [CardStatus.Removed] } }, { userId: requestor._id }, { 'integrations.rare': null }],
  });
};

const removeKardIntegrationDataFromCard = async (card: ICardDocument): Promise<ICard> => {
  card.binToken = undefined;
  card.lastFourDigitsToken = undefined;
  card.integrations.kard = undefined;
  return card.save();
};

export const enrollInKardRewards = async (
  req: IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>,
): Promise<ICardDocument> => {
  // validate data
  const kardRewardsRegisterRequestSchema = z.object({
    lastFour: z
      .string()
      .length(4)
      .refine((val) => /^\d+$/.test(val), { message: 'Must be a number' }),
    bin: z
      .string()
      .length(6)
      .refine((val) => /^\d+$/.test(val), { message: 'Must be a number' })
      .refine((val) => !!getNetworkFromBin(val), {
        message: 'Must be with a participating network: Visa, MasterCard, Discover, or American Express',
      }),
    card: z.string().refine((val) => isValidObjectId(val), { message: 'Must be a valid object id' }),
  });

  const parsed = kardRewardsRegisterRequestSchema.safeParse({ ...req.body, card: req.params.card });
  if (!parsed.success) {
    const formattedError = formatZodFieldErrors(
      ((parsed as SafeParseError<KardRewardsRegisterRequest>)?.error as ZodError)?.formErrors?.fieldErrors,
    );
    throw new CustomError(`${formattedError || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
  }
  let user: IUserDocument;

  try {
    user = await UserModel.findById(req.requestor?._id);
  } catch (e) {
    throw new CustomError(`Error looking up user: ${req.requestor?._id}`, ErrorTypes.SERVER);
  }
  if (!user) {
    throw new CustomError('User not found', ErrorTypes.NOT_FOUND);
  }

  let card: ICardDocument;
  try {
    card = await _getCard({ _id: parsed.data.card, user: req.requestor._id });
  } catch (e) {
    throw new CustomError('Error looking up card', ErrorTypes.SERVER);
  }
  if (!card) {
    throw new CustomError('Card not found', ErrorTypes.NOT_FOUND);
  }

  // check if the card is already registered and error out if it is
  if (!!card.integrations?.kard?.userId && !!card.lastFourDigitsToken && !!card.binToken) {
    throw new CustomError('Card already registered', ErrorTypes.CONFLICT);
  }

  try {
    // add the encrypted data to the card
    card.binToken = encrypt(parsed.data.bin);
    card.lastFourDigitsToken = encrypt(parsed.data.lastFour);
    card.lastModified = dayjs().utc().toDate();
  } catch (e) {
    console.error(e);
    throw new CustomError('Error saving card data', ErrorTypes.SERVER);
  }

  try {
    const updatedCard = await createKardUserAndAddIntegrations(user, card);
    console.log('updated card', JSON.stringify(updatedCard, null, 2));
    return updatedCard.save();
  } catch (e) {
    console.error(e);
    await removeKardIntegrationDataFromCard(card);
    throw new CustomError('Error creating kard user and adding integrations', ErrorTypes.SERVER);
  }
};

export const unenrollFromKardRewards = async (
  req: IRequest<KardRewardsParams, {}, {}>,
): Promise<ICardDocument> => {
  // validate data
  const kardRewardsRegisterRequestSchema = z.object({
    card: z.string().refine((val) => isValidObjectId(val), { message: 'Must be a valid object reference' }),
  });
  const parsed = kardRewardsRegisterRequestSchema.safeParse(req.params);
  if (!parsed.success) {
    const formattedError = formatZodFieldErrors(
      ((parsed as SafeParseError<KardRewardsRegisterRequest>)?.error as ZodError)?.formErrors?.fieldErrors,
    );
    throw new CustomError(`${formattedError || 'Error parsing request'}`, ErrorTypes.INVALID_ARG);
  }

  let card: ICardDocument;
  try {
    card = await _getCard({ _id: req.params.card });
  } catch (e) {
    throw new CustomError('Error looking up card', ErrorTypes.SERVER);
  }
  if (!card) {
    throw new CustomError('Card not found', ErrorTypes.NOT_FOUND);
  }

  // check if the card is already unenrolled or desnot have an integration and error out if it is
  if (!card?.integrations?.kard?.createdOn || card.integrations?.kard?.enrollmentStatus === KardEnrollmentStatus.Unenrolled) {
    throw new CustomError('Card is not enrolled in rewards', ErrorTypes.CONFLICT);
  }

  try {
    // delete kard user
    await deleteKardUserForCard(card);
    card.integrations.kard.enrollmentStatus = KardEnrollmentStatus.Unenrolled;
    return card.save();
  } catch (e) {
    console.error(e);
    throw new CustomError('Error saving card data', ErrorTypes.SERVER);
  }
};

export const mapMarqetaCardtoCard = async (_userId: string, cardData: IMarqetaCardIntegration[]) => {
  let cards = await CardModel.findOne({ userId: _userId });
  if (!cards) {
    // If the card document doesn't exist, you may choose to create a new one
    cards = new CardModel({ userId: _userId, status: CardStatus.Linked });
  }
  for (const card of cardData) {
    const { user_token, token, expiration_time, last_four, pan } = card;
    if (!user_token) throw new CustomError('A user_token is required', ErrorTypes.INVALID_ARG);
    // extract the expiration year & month of the card
    const { year, month } = extractYearAndMonth(expiration_time);

    // prepare the cardItem Details
    const cardItem = {
      ...card,
      card_token: token,
      expr_month: month,
      expr_year: year,
      last_four: encrypt(last_four),
      pan: encrypt(pan),
    };
    // Update the Marqeta details in the integrations.marqeta field
    cards.integrations.marqeta.push(cardItem);
  }

  // Save the updated card document
  await cards.save();
};
