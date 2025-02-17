/* eslint-disable camelcase */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { FilterQuery, ObjectId } from 'mongoose';
import { SafeParseError, z, ZodError } from 'zod';
import { PlaidClient } from '../../clients/plaid';
import { createKardUserAndAddIntegrations, deleteKardUserForCard } from '../../integrations/kard';
import { CardStatus, ErrorTypes, IMapMarqetaCard, KardEnrollmentStatus } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { encrypt } from '../../lib/encryption';
import { formatZodFieldErrors, objectReferenceValidation } from '../../lib/validation';
import { CardModel, ICard, ICardDocument, IShareableCard, IMarqetaCardIntegration } from '../../models/card';
import { IRef } from '../../types/model';
import { IRequest } from '../../types/request';
import { getNetworkFromBin } from './utils';
import { extractYearAndMonth } from '../../lib/date';
import {
  createCardShippedUserNotification,
  createPushUserNotificationFromUserAndPushData,
} from '../user_notification';
import { PushNotificationTypes } from '../../lib/constants/notification';
import { getShareableUser } from '../user/utils';
import { MarqetaClient } from '../../clients/marqeta/marqetaClient';
import { Card } from '../../clients/marqeta/card';
import { IUserDocument, UserModel } from '../../models/user';
import { IShareableUser } from '../../models/user/types';
import { MarqetaCardState, IMarqetaWebhookCardsEvent, MarqetaCardModel, MarqetaCardWebhookType, IMarqetaTransitionReasonCodesEnum } from '../../integrations/marqeta/types';

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
  const _user: IRef<ObjectId, IShareableUser> = !!(userId as IUserDocument)?.name ? getShareableUser(userId as IUserDocument) : userId;

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
  if (!!card?.integrations?.plaid?.accessToken) {
    await client.removeItem({ access_token: card.integrations.plaid.accessToken });
    const cards = await CardModel.find({ 'integrations.plaid.accessToken': card.integrations.plaid.accessToken });

    for (const currentCard of cards) {
      currentCard.integrations.plaid.accessToken = null;
      if (currentCard.integrations.plaid.unlinkedAccessTokens === null) {
        currentCard.integrations.plaid.unlinkedAccessTokens = [card.integrations.plaid.accessToken];
      } else {
        currentCard.integrations.plaid.unlinkedAccessTokens.push(card.integrations.plaid.accessToken);
      }

      await currentCard.save();
    }
  }

  if (removeData) {
    // await TransactionModel.deleteMany({ user: requestor._id, card: card._id });
    // TODO: these jobs should ideally be broken down into jobs for users and jobs to get totals
    // currently we have to process all users and cards to get the totals and will need to run
    // after any user removes a card + transactions
    // MainBullClient.createJob(JobNames.GenerateUserTransactionTotals, {});
    // MainBullClient.createJob(JobNames.GenerateUserImpactTotals, {});
  }
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

export const enrollInKardRewards = async (req: IRequest<KardRewardsParams, {}, KardRewardsRegisterRequest>): Promise<ICardDocument> => {
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
    card: objectReferenceValidation,
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

export const unenrollFromKardRewards = async (req: IRequest<KardRewardsParams, {}, {}>): Promise<ICardDocument> => {
  // validate data
  const kardRewardsRegisterRequestSchema = z.object({
    card: objectReferenceValidation,
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

export const getCardStatusFromMarqetaCardState = (cardState: MarqetaCardState): CardStatus => {
  switch (cardState) {
    case MarqetaCardState.ACTIVE:
      return CardStatus.Linked;
    case MarqetaCardState.TERMINATED:
      return CardStatus.Removed;
    case MarqetaCardState.SUSPENDED:
      return CardStatus.Locked;
    case MarqetaCardState.UNACTIVATED:
      return CardStatus.Linked;
    case MarqetaCardState.LIMITED:
      return CardStatus.Locked;
    default:
      return CardStatus.Error;
  }
};

export const mapMarqetaCardtoCard = async (_userId: string, cardData: IMarqetaCardIntegration | IMarqetaWebhookCardsEvent | MarqetaCardModel) => {
  const {
    user_token,
    token,
    card_product_token,
    expiration_time,
    last_four,
    pan,
    fulfillment_status,
    barcode,
    created_time,
    instrument_type,
    pin_is_set,
    state,
    reason,
    reason_code,
    card_token,
  } = cardData;

  // Find the existing card document with Marqeta integration
  let card = await CardModel.findOne({
    $and: [{ userId: _userId }, { 'integrations.marqeta': { $exists: true } }, { 'integrations.marqeta.card_token': token }],
  });

  // If the card document doesn't exist, you may choose to create a new one , with default values for karma Card
  if (!card) {
    card = new CardModel({ userId: _userId, mask: last_four, ...IMapMarqetaCard });
  }

  if (!user_token) throw new CustomError('A user_token is required', ErrorTypes.INVALID_ARG);
  // extract the expiration year & month of the card
  if (!expiration_time) throw new CustomError('A expiration_time is required', ErrorTypes.INVALID_ARG);
  const { year, month } = extractYearAndMonth(expiration_time);

  // prepare the cardItem Details
  const cardItem: any = {
    barcode,
    card_product_token,
    card_token: !!card_token ? card_token : token,
    created_time,
    expr_month: month,
    expr_year: year,
    fulfillment_status,
    instrument_type,
    last_four: encrypt(last_four),
    pan: encrypt(pan),
    pin_is_set,
    user_token,
    state,
    reason,
    reason_code,
  };
  // Set lastModified date
  card.lastModified = dayjs().utc().toDate();
  // Update the Marqeta details in the integrations.marqeta field
  card.integrations.marqeta = cardItem;
  card.status = getCardStatusFromMarqetaCardState(cardData.state);
  // Save the updated card document
  await card.save();
  return card;
};

export const handleMarqetaCardNotificationFromWebhook = async (
  cardFromWebhook: IMarqetaWebhookCardsEvent,
  oldCard: ICardDocument,
  user: IUserDocument,
) => {
  const prevCardStatus = oldCard?.integrations?.marqeta?.state?.toUpperCase();
  const newCardStatus = cardFromWebhook?.state?.toUpperCase();

  if (prevCardStatus === newCardStatus) {
    console.log('////// No card state change, no notification to send //////');
    return;
  }

  if (Object.values(MarqetaCardState)?.includes(newCardStatus as MarqetaCardState)) {
    let cardType = '';
    if (cardFromWebhook?.card_product_token.includes('phys')) cardType = 'physical';
    if (cardFromWebhook?.card_product_token.includes('virt')) cardType = 'digital';

    // Notification for the first-time activation of a card, for example, when a card is activated using the widget.
    if (
      (prevCardStatus === MarqetaCardState.UNACTIVATED || prevCardStatus === MarqetaCardState.SUSPENDED)
      && newCardStatus === MarqetaCardState.ACTIVE
    ) {
      console.log('// Sending card activated notification //');
      await createPushUserNotificationFromUserAndPushData(user, {
        pushNotificationType: PushNotificationTypes.CARD_TRANSITION,
        body: `You have successfully activated your ${cardType} card.`,
        title: 'Security Alert!',
      });
    }

    // Notification for an event when we lock a card from the app.
    if (prevCardStatus === MarqetaCardState.ACTIVE && newCardStatus === MarqetaCardState.LIMITED) {
      console.log('// Sending card locked notification //');
      await createPushUserNotificationFromUserAndPushData(user, {
        pushNotificationType: PushNotificationTypes.CARD_TRANSITION,
        body: `You have successfully locked your ${cardType} card.`,
        title: 'Security Alert!',
      });
    }

    // Notification for an event when we unlock a card from the app.
    if (prevCardStatus === MarqetaCardState.LIMITED && newCardStatus === MarqetaCardState.ACTIVE) {
      console.log('// Sending card unlocked notification //');
      await createPushUserNotificationFromUserAndPushData(user, {
        pushNotificationType: PushNotificationTypes.CARD_TRANSITION,
        body: `You have successfully unlocked your ${cardType} card.`,
        title: 'Security Alert!',
      });
    }
  }
};

export const updateCardFromMarqetaCardWebhook = async (cardFromWebhook: IMarqetaWebhookCardsEvent) => {
  const { year, month } = extractYearAndMonth(cardFromWebhook.expiration_time);
  const existingCard = await CardModel.findOne({ 'integrations.marqeta.card_token': cardFromWebhook?.token });

  const newData: any = {
    card_token: cardFromWebhook?.token,
    user_token: cardFromWebhook?.user_token,
    card_product_token: cardFromWebhook?.card_product_token,
    pan: encrypt(cardFromWebhook?.pan),
    last_four: encrypt(cardFromWebhook?.last_four),
    expr_month: month,
    expr_year: year,
    created_time: existingCard?.integrations?.marqeta?.created_time,
    pin_is_set: existingCard?.integrations?.marqeta?.pin_is_set,
    state: cardFromWebhook?.state,
    fulfillment_status: cardFromWebhook?.fulfillment_status,
    reason: cardFromWebhook?.reason,
    reason_code: cardFromWebhook?.reason_code,
  };

  // if not an existing card, create a new card
  if (!existingCard) {
    // if virtual card ensure set to active when first created
    if (newData.card_product_token.includes('virt')) newData.state = MarqetaCardState.ACTIVE;
    const internalUser = await UserModel.findOne({ 'integrations.marqeta.userToken': cardFromWebhook.user_token });
    console.log('///// Creating a new card from Marqeta webhook /////');
    await mapMarqetaCardtoCard(internalUser._id.toString(), cardFromWebhook);
  } else {
    existingCard.integrations.marqeta = newData;
    existingCard.lastModified = dayjs().utc().toDate();
    existingCard.status = getCardStatusFromMarqetaCardState(cardFromWebhook.state);
    console.log('///// Updating existing card from Marqeta webhook /////');
    await existingCard.save();
  }
};

export const sendCardUpdateEmails = async (cardFromWebhook: IMarqetaWebhookCardsEvent) => {
  switch (cardFromWebhook?.type) {
    case MarqetaCardWebhookType.SHIPPED:
      await createCardShippedUserNotification(cardFromWebhook);
      break;
    default:
      console.log('///// No action needed for this webhook type');
  }
};

export const handleMarqetaCardWebhook = async (cardWebhookData: IMarqetaWebhookCardsEvent) => {
  // Instantiate the MarqetaClient
  const marqetaClient = new MarqetaClient();

  // Instantiate the CARD class
  const cardClient = new Card(marqetaClient);
  const cardDataInMarqeta = await cardClient.getCardDetails(cardWebhookData?.card_token);

  if (!cardDataInMarqeta) throw new CustomError(`Card with marqeta user token of ${cardWebhookData?.user_token} not found`, ErrorTypes.NOT_FOUND);
  // if reason attribute is missing in cardWebhookData then populate the reason based on reason_code
  console.log('[+] Handling Marqeta Card Webhook', {
    cardWebhookData,
  });

  if (cardWebhookData.state === cardDataInMarqeta.state) {
    if (!cardWebhookData.reason) {
      const { reason_code } = cardWebhookData;
      cardWebhookData.reason = IMarqetaTransitionReasonCodesEnum[reason_code] ?? '';
    }
  }

  const user = await UserModel.findOne({ 'integrations.marqeta.userToken': cardWebhookData?.user_token });
  if (!user?._id) throw new CustomError(`User with marqeta user token of ${cardWebhookData?.user_token} not found`, ErrorTypes.NOT_FOUND);
  const prevCardData = await CardModel.findOne({ 'integrations.marqeta.card_token': cardWebhookData?.card_token });
  await updateCardFromMarqetaCardWebhook(cardDataInMarqeta);
  await sendCardUpdateEmails(cardDataInMarqeta);
  await handleMarqetaCardNotificationFromWebhook(cardDataInMarqeta, prevCardData, user);
};
