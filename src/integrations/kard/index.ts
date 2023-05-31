import { AxiosResponse } from 'axios';
import { Types } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { SafeParseError, z } from 'zod';
import { CardInfo, CreateUserRequest, KardClient } from '../../clients/kard';
import { CardStatus } from '../../lib/constants';
import { getUtcDate } from '../../lib/date';
import { decrypt } from '../../lib/encryption';
import { CardModel, ICardDocument } from '../../models/card';
import { IKardIntegration, IUser, IUserDocument, UserModel } from '../../models/user';

// get accounts for this user that are linked, but don't have the kard integration object
const getNotSyncedCardData = async (userId: Types.ObjectId): Promise<(ICardDocument & { user: IUserDocument })[]> => {
  // lookup the user and their linked cards in the db
  const aggData = await CardModel.aggregate()
    .match({
      userId,
      status: CardStatus.Linked,
      $or: [
        { 'integrations.kard': { $exists: false } },
        { 'integrations.kard': { $eq: null } },
        { 'integrations.kard.dateAdded': { $exists: false } },
        { 'integrations.kard.dateAdded': { $eq: null } },
      ],
    })
    .lookup({
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'user',
    })
    .unwind({
      path: '$user',
      preserveNullAndEmptyArrays: false,
    });

  return aggData;
};

export const getFormattedIssuer = (issuer: string): string => issuer?.trim()?.toUpperCase()?.split(' ')?.join('') || '';
export const getFormattedUserName = (name: string): string => name?.trim()?.split(' ')?.join('') || '';

export const getCardInfo = (card: ICardDocument): CardInfo => {
  const last4 = !!card?.lastFourDigitsToken ? decrypt(card.lastFourDigitsToken) : '';
  const bin = !!card?.binToken ? decrypt(card.binToken) : '';
  const issuer = getFormattedIssuer(card?.institution);
  const network = !!card?.networkToken ? decrypt(card.networkToken) : '';
  if (!last4 || !bin || !issuer || !network) {
    throw new Error('Missing card info');
  }
  return {
    last4,
    bin,
    issuer,
    network,
  };
};
const addKardIntegrationToCard = async (card: ICardDocument): Promise<ICardDocument> => CardModel.findByIdAndUpdate(card._id, { 'integrations.kard': { dateAdded: getUtcDate().toDate() } }, { new: true });

export const updateKardData = async (userId: Types.ObjectId): Promise<void> => {
  // check if the user has a kard integration Object
  const cardData = await getNotSyncedCardData(userId);
  if (!cardData?.length) {
    return;
  }
  const user = cardData[0]?.user as IUser & { _id: Types.ObjectId };
  const email = user?.emails?.find((e) => e.primary)?.email;

  const dateKardAccountCreated = user?.integrations?.kard?.dateAccountCreated;
  if (!dateKardAccountCreated) {
    const kard = new KardClient();
    const userKardIntegration: IKardIntegration = {
      userId: uuid(),
      dateAccountCreated: getUtcDate().toDate(),
    };

    const req: CreateUserRequest = {
      email,
      userName: getFormattedUserName(user?.name),
      cardInfo: getCardInfo(cardData[0]),
      referringPartnerUserId: userKardIntegration.userId,
    };
    console.log('creating new kard user for userId: ', user._id);
    await kard.createUser(req);
    // create a kard integration object with id and date created and save it to the user
    await UserModel.findByIdAndUpdate(cardData[0]?.userId, { 'integrations.kard': userKardIntegration }, { new: true });
    await addKardIntegrationToCard(cardData[0]);
  }

  // add the rest of the cards to Kard
  const cardsToSync = cardData.slice(1);
  if (cardsToSync?.length > 0) {
    const kard = new KardClient();
    Promise.all(
      cardsToSync.map(async (card) => {
        // add card to user
        // If an error is thrown, we abort this sync
        const cardInfo = getCardInfo(card);
        await kard.addCardToUser({
          referringPartnerUserId: user.integrations.kard.userId,
          cardInfo,
        });
        // update the card with the kard integration object
        await addKardIntegrationToCard(card);
      }),
    );
  }
};

export const isUserObject = (user: any): boolean => '_id' in Object.keys(user);
// delete a user from Kard
export const deleteKardUser = async (
  user: Types.ObjectId | (IUser & { _id: Types.ObjectId }),
): Promise<AxiosResponse | void> => {
  if (!isUserObject(user)) {
    user = await UserModel.findById(user);
  }
  const u = user as IUserDocument;
  const uuidSchema = z.string().uuid();

  if (
    !u?.integrations?.kard?.userId
    || !!(uuidSchema.safeParse(u.integrations.kard.userId) as SafeParseError<string>).error
  ) {
    console.error(
      'Error deleting kard account.\nNo kard integration object or invalid kard user id.\nuser integrations:  ',
      JSON.stringify(u.integrations, null, 2),
    );
    return;
  }

  console.log('deleting user, ', u._id, ', from kard');
  const kc = new KardClient();
  return kc.deleteUser(u.integrations.kard.userId);
};
