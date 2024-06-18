/* eslint-disable camelcase */
import { Types } from 'mongoose';
import { SafeParseError, z, ZodError } from 'zod';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../lib/constants';
import {
  NotificationChannelEnum,
  NotificationChannelEnumValue,
  NotificationTypeEnum,
  NotificationTypeEnumValue,
  PushNotificationTypes,
} from '../../lib/constants/notification';
import {
  UserNotificationResourceTypeEnum,
  UserNotificationResourceTypeEnumValue,
  UserNotificationStatusEnum,
  UserNotificationStatusEnumValue,
} from '../../lib/constants/user_notification';
import CustomError from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { roundToPercision } from '../../lib/misc';
import { formatZodFieldErrors, getZodEnumSchemaFromTypescriptEnum, optionalObjectReferenceValidation } from '../../lib/validation';
import { IChargebackDocument } from '../../models/chargeback';
import { CommissionPayoutModel, ICommissionPayoutDocument } from '../../models/commissionPayout';
import { CommissionModel, ICommissionDocument } from '../../models/commissions';
import { ICompanyDocument } from '../../models/company';
import { GroupModel, IGroupDocument } from '../../models/group';
import { ITransactionDocument, TransactionModel } from '../../models/transaction';
import { IUserDocument, UserModel } from '../../models/user';
import {
  IEarnedCashbackNotificationData,
  IPayoutNotificationData,
  IShareableUserNotification,
  IUserNotificationDocument,
  UserNotificationModel,
  ICaseWonProvisionalCreditAlreadyIssuedNotificationData,
  IKarmaCardWelcomeData,
  IBankLinkedConfirmationEmailData,
  IPushNotificationData,
  IEarnedCashbackPushNotificationData,
} from '../../models/user_notification';
import { IRequest } from '../../types/request';
import { executeUserNotificationEffects } from '../notification';
import { IACHTransferEmailData, IKarmaCardDeclinedData, IKarmaCardUpdateData } from '../email/types';
import { IMarqetaWebhookCardsEvent } from '../../integrations/marqeta/types';
import { VisitorModel } from '../../models/visitor';
import { IResumeKarmaCardEmailData } from '../notification/types';

dayjs.extend(utc);

export type CreateNotificationRequest<T = undefined> = {
  type: NotificationTypeEnumValue;
  status: UserNotificationStatusEnumValue;
  channel?: NotificationChannelEnumValue;
  user?: Types.ObjectId;
  visitor?: Types.ObjectId;
  resource?: Types.ObjectId;
  data?: T;
};

export const getExistingTransactionFromChargeback = async (c: IChargebackDocument) => {
  const existingTransaction = await TransactionModel.findOne({
    $or: [
      {
        $and: [
          { 'integrations.marqeta.token': { $exists: true } },
          { 'integrations.marqeta.token': c.integrations.marqeta.transaction_token },
        ],
      },
      {
        $and: [
          { 'integrations.marqeta.relatedTransactions.token': { $exists: true } },
          { 'integrations.marqeta.relatedTransactions.token': c.integrations.marqeta.transaction_token },
        ],
      },
    ],
  });

  if (!!existingTransaction) return existingTransaction;
  return null;
};

export const getShareableUserNotification = (notification: IUserNotificationDocument): IShareableUserNotification => ({
  _id: notification._id,
  createdOn: notification.createdOn,
  body: notification?.data?.body,
}) as IShareableUserNotification;

const getResourceByUserNotificationType = async (
  resourceId: Types.ObjectId,
  type: NotificationTypeEnumValue,
): Promise<{
  resource: IGroupDocument | ITransactionDocument | ICommissionPayoutDocument | null;
  resourceType: UserNotificationResourceTypeEnumValue;
} | null> => {
  try {
    switch (type) {
      case NotificationTypeEnum.Group:
        return { resource: await GroupModel.findById(resourceId), resourceType: UserNotificationResourceTypeEnum.Group };
      case NotificationTypeEnum.EarnedCashback:
        return {
          resource: await TransactionModel.findById(resourceId),
          resourceType: UserNotificationResourceTypeEnum.Transaction,
        };
      case NotificationTypeEnum.Payout:
        return {
          resource: await CommissionPayoutModel.findById(resourceId),
          resourceType: UserNotificationResourceTypeEnum.CommissionPayout,
        };
      default:
        return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  }
};

const getZodDataSchemaFromData = <DataType>(data: DataType): z.ZodSchema => {
  if (!data) {
    return z.object({}).optional();
  }
  const payoutNotificationDataFields = ['name', 'payoutAmount'];
  const isPayoutNotificationData = Object.keys(data)?.reduce((acc, curr) => {
    if (!(curr in payoutNotificationDataFields)) {
      return false;
    }
    return acc;
  }, true);
  if (isPayoutNotificationData) {
    return z
      .object({
        name: z.string().max(100),
        payoutAmount: z
          .string()
          .max(8)
          .refine((val) => /^\d+(\.\d+)?$/.test(val), { message: 'Must be a number' }),
      })
      .optional();
  }

  const earnedCashbackDataFields = ['name', 'companyName'];
  const isEarnedCashbackNotificationData = Object.keys(data).reduce((acc, curr) => {
    if (!(curr in earnedCashbackDataFields)) {
      return false;
    }
    return acc;
  }, true);
  if (isEarnedCashbackNotificationData) {
    return z
      .object({
        name: z.string().max(100),
        companyName: z.string().max(100),
      })
      .optional();
  }
  return z.object({}).optional();
};

const prepareZodCreateUserNotificationSchema = <DataType>(
  req: CreateNotificationRequest<DataType>,
  hasResource: boolean,
): z.ZodSchema | void => {
  try {
    return z.object({
      type: getZodEnumSchemaFromTypescriptEnum(NotificationTypeEnum),
      status: getZodEnumSchemaFromTypescriptEnum(UserNotificationStatusEnum),
      channel: getZodEnumSchemaFromTypescriptEnum(NotificationChannelEnum).optional(),
      user: optionalObjectReferenceValidation,
      resource: optionalObjectReferenceValidation,
      resourceType: z
        .string()
        .optional()
        .refine((val) => !(hasResource && !val)),
      body: z.string().optional(),
      data: getZodDataSchemaFromData(req?.data),
    });
  } catch (err) {
    console.log(err);
  }
};

const getUserById = async (id: Types.ObjectId): Promise<IUserDocument | null> => {
  try {
    const userDoc = await UserModel.findById(id);
    if (!userDoc || !userDoc._id) {
      throw new CustomError('User not found', ErrorTypes.NOT_FOUND);
    }
    return userDoc;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const saveUserNotification = async (notification: IUserNotificationDocument): Promise<IUserNotificationDocument> => {
  try {
    if (!notification?.save) throw new CustomError('Error saving notification', ErrorTypes.SERVER);

    const savedNotification = await notification.save();
    if (!savedNotification || !savedNotification._id) {
      throw new CustomError('Error saving notification', ErrorTypes.SERVER);
    }
    return savedNotification;
  } catch (err) {
    console.error(err);
    throw new CustomError('Error saving notification', ErrorTypes.SERVER);
  }
};

// createNotification creates a notification in our db and triggers any side effects
// takes an optional body, channel, and resource; requires a type and status
export const createUserNotification = async <DataType>(
  req: IRequest<{}, {}, CreateNotificationRequest<DataType>>,
): Promise<IUserNotificationDocument | void> => {
  const { type, status, channel, resource, user, data, visitor } = req.body;

  const createNotificationSchema = prepareZodCreateUserNotificationSchema(req.body, !!resource);
  if (!createNotificationSchema) {
    throw new CustomError('Error parsing request body', ErrorTypes.INVALID_ARG);
  }
  // validate request body
  const parsed = createNotificationSchema.safeParse(req.body);
  if (!parsed.success) {
    const formattedError = formatZodFieldErrors(
      ((parsed as SafeParseError<CreateNotificationRequest<DataType>>)?.error as ZodError)?.formErrors?.fieldErrors,
    );
    throw new CustomError(`${formattedError || 'Error parsing request body'}`, ErrorTypes.INVALID_ARG);
  }

  // lookup the reference
  let resourceDoc: IGroupDocument | ITransactionDocument | ICommissionPayoutDocument | null;
  let resourceType: UserNotificationResourceTypeEnumValue;
  if (resource) {
    const r = await getResourceByUserNotificationType(resource, type);
    if (!r || !r?.resource || !r?.resourceType) {
      throw new CustomError('Resource not found', ErrorTypes.NOT_FOUND);
    }
    ({ resource: resourceDoc, resourceType } = r);
  }

  const notificationData: any = {
    type,
    status,
    channel,
    resource: resourceDoc || undefined,
    resourceType,
    data,
    createdOn: getUtcDate(),
  };

  if (!!user) {
    const userDoc = await getUserById(user);

    if (!userDoc) {
      throw new CustomError('User not found', ErrorTypes.NOT_FOUND);
    }

    notificationData.user = userDoc;
  }

  if (!!visitor) {
    const visitorDoc = await VisitorModel.findById(visitor);

    if (!visitorDoc) {
      throw new CustomError('Visitor not found', ErrorTypes.NOT_FOUND);
    }

    notificationData.visitor = visitorDoc;
  }

  const notification = new UserNotificationModel(notificationData);

  await executeUserNotificationEffects(notification);
  return saveUserNotification(notification);
};

const getNotificationTypeFromPushNotificationType = (pushNotificationType: PushNotificationTypes): NotificationTypeEnumValue | '' => {
  switch (pushNotificationType) {
    case PushNotificationTypes.EARNED_CASHBACK:
      return NotificationTypeEnum.EarnedCashback;
    case PushNotificationTypes.EMPLOYER_GIFT:
      return NotificationTypeEnum.EmployerGift;
    case PushNotificationTypes.REWARD_DEPOSIT:
      return NotificationTypeEnum.Payout;
    case PushNotificationTypes.FUNDS_AVAILABLE:
      return NotificationTypeEnum.FundsAvailable;
    case PushNotificationTypes.TRANSACTION_COMPLETE:
      return NotificationTypeEnum.TransactionComplete;
    case PushNotificationTypes.CARD_TRANSITION:
      return NotificationTypeEnum.CardTransition;
    case PushNotificationTypes.BALANCE_THRESHOLD:
      return NotificationTypeEnum.BalanceThreshold;
    case PushNotificationTypes.RELOAD_SUCCESS:
      return NotificationTypeEnum.ReloadSuccess;
    case PushNotificationTypes.TRANSACTION_OF_DINING:
      return NotificationTypeEnum.DiningTransaction;
    case PushNotificationTypes.TRANSACTION_OF_GAS:
      return NotificationTypeEnum.GasTransaction;
    case PushNotificationTypes.ACH_TRANSFER_CANCELLED:
      return NotificationTypeEnum.ACHTransferCancelled;
    case PushNotificationTypes.LOW_BALANCE:
      return NotificationTypeEnum.LowBalance;
    default:
      return '';
  }
};

export const createPushUserNotificationFromUserAndPushData = async <NotificationDataType>(
  user: IUserDocument,
  data: NotificationDataType,
  disablePush = false,
): Promise<IUserNotificationDocument | void> => {
  try {
    // make sure this data is a push notification type
    const { pushNotificationType, body, title } = data as unknown as IPushNotificationData;

    if (!pushNotificationType || !body || !title) {
      throw Error(`Error creating notification for user: ${user}. Missing data: ${data}`);
    }

    const mockRequest = {
      body: {
        type: getNotificationTypeFromPushNotificationType(pushNotificationType),
        status: UserNotificationStatusEnum.Unread,
        channel: disablePush ? undefined : NotificationChannelEnum.Push,
        user: user?._id?.toString(),
        data,
      } as CreateNotificationRequest<NotificationDataType>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<NotificationDataType>>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating notification: ${e}`);
  }
};

export const createEmployerGiftEmailUserNotification = async (
  user: IUserDocument,
  transaction: ITransactionDocument,
): Promise<IUserNotificationDocument | void> => {
  try {
    const mockRequest = {
      body: {
        type: NotificationTypeEnum.EmployerGift,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          amount: transaction.amount.toFixed(2),
        },
      } as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating notification: ${e}`);
  }
};

export const getCommissionWithPopulatedUserAndCompany = async (commission: ICommissionDocument) => {
  const commissionWithPopulatedUserAndCompany: ICommissionDocument[] = await CommissionModel.aggregate()
    .match({
      _id: commission._id,
    })
    .lookup({
      from: 'companies',
      localField: 'company',
      foreignField: '_id',
      as: 'company',
    })
    .unwind({ path: '$company' })
    .lookup({
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'user',
    })
    .unwind({ path: '$user' });

  if (
    !commissionWithPopulatedUserAndCompany
      || !commissionWithPopulatedUserAndCompany.length
      || !commissionWithPopulatedUserAndCompany[0]
      || !(commissionWithPopulatedUserAndCompany[0]?.company as ICompanyDocument)?.companyName
      || !(commissionWithPopulatedUserAndCompany[0]?.user as IUserDocument)?.name
  ) {
    throw Error(`Error creating notification for commission: ${commission}`);
  }

  return commissionWithPopulatedUserAndCompany;
};

export const createEarnedCashbackEmailNotificationFromCommission = async (
  commission: ICommissionDocument,
  disableEmail = false,
): Promise<IUserNotificationDocument | void> => {
  // get user and company data
  try {
    const commissionWithPopulatedUserAndCompany: ICommissionDocument[] = await getCommissionWithPopulatedUserAndCompany(commission);
    const company = commissionWithPopulatedUserAndCompany[0].company as ICompanyDocument;
    const user = commissionWithPopulatedUserAndCompany[0].user as IUserDocument;

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.EarnedCashback,
        status: UserNotificationStatusEnum.Unread,
        channel: disableEmail ? undefined : NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          body: `You just earned $${roundToPercision(commission.amount, 2)} in cashback from ${company.companyName}`,
          companyName: company.companyName,
          commissionId: commission._id,
        },
      } as CreateNotificationRequest<IEarnedCashbackNotificationData>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<IEarnedCashbackNotificationData>>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating earned cashback email notification: ${e}`);
  }
};

export const createEarnedCashbackPushNotificationFromCommission = async (commission: ICommissionDocument) => {
  try {
    const commissionWithPopulatedUserAndCompany: ICommissionDocument[] = await getCommissionWithPopulatedUserAndCompany(commission);
    const user = commissionWithPopulatedUserAndCompany[0]?.user as IUserDocument;
    const amountToUser = commission.allocation.user.toFixed(2);

    if (!user?.integrations?.marqeta) {
      throw new CustomError(`User with commission: ${commission} does not have a marqeta integration.`);
    }

    await createPushUserNotificationFromUserAndPushData(user, {
      pushNotificationType: PushNotificationTypes.EARNED_CASHBACK,
      body: `You earned $${amountToUser} in Karma Cash`,
      title: 'You earned Karma Cash!',
      commissionId: commission._id,
    } as IEarnedCashbackPushNotificationData);
  } catch (e) {
    console.log(`Error creating earned cashback push notification: ${e}`);
  }
};

export const createEarnedCashbackNotificationsFromCommission = async (
  commission: ICommissionDocument,
  channels: NotificationChannelEnumValue[],
): Promise<(IUserNotificationDocument | void
  )[]> => (
  await Promise.all(
    channels.map(async (channel) => {
      const existingNotification = await UserNotificationModel.findOne({
        $and: [
          {
            user: commission.user,
            type: NotificationTypeEnum.EarnedCashback,
            'data.commissionId': { $exists: true },
            channel,
          },
          {
            user: commission.user,
            type: NotificationTypeEnum.EarnedCashback,
            'data.commissionId': commission._id,
            channel,
          },
        ] });

      if (!!existingNotification?._id) {
        console.log(`Notification already exists for commission: ${commission._id} and user: ${commission.user}`);
        console.log(`Notification: ${JSON.stringify(existingNotification)}`);
        return;
      }

      switch (channel) {
        case NotificationChannelEnum.Email:
          return createEarnedCashbackEmailNotificationFromCommission(commission);
        case NotificationChannelEnum.Push:
          return createEarnedCashbackPushNotificationFromCommission(commission);
        default:
          return null;
      }
    }),
  )
).filter((notification) => !!notification);

export const getCommissionPayoutWithPopulatedUser = async (commissionPayout: ICommissionPayoutDocument): Promise<ICommissionPayoutDocument[]> => {
  const commissionPayoutWithPopulatedUser: ICommissionPayoutDocument[] = await CommissionPayoutModel.aggregate()
    .match({
      _id: commissionPayout._id,
    })
    .lookup({
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'user',
    })
    .unwind({ path: '$user' });

  if (
    !commissionPayoutWithPopulatedUser
      || !commissionPayoutWithPopulatedUser.length
      || !commissionPayoutWithPopulatedUser[0]
      || !(commissionPayoutWithPopulatedUser[0]?.user as IUserDocument)?.name
  ) {
    throw Error(`Error creating notification for commission payout: ${commissionPayout}`);
  }
  return commissionPayoutWithPopulatedUser;
};

export const createPayoutEmailNotificationFromCommissionPayout = async (
  commissionPayout: ICommissionPayoutDocument,
): Promise<IUserNotificationDocument | void> => {
  // get user and company data
  try {
    const commissionPayoutWithPopulatedUser: ICommissionPayoutDocument[] = await getCommissionPayoutWithPopulatedUser(commissionPayout);
    const user = commissionPayoutWithPopulatedUser[0].user as IUserDocument;
    const payoutAmount = commissionPayout.amount.toFixed(2);

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.Payout,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          body: `You were sent $${payoutAmount} in cashback rewards!`,
          payoutAmount: `${payoutAmount}`,
        },
      } as CreateNotificationRequest<IPayoutNotificationData>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<IPayoutNotificationData>>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating payout email notification: ${e}`);
  }
};

export const createPayoutPushNotificationFromCommissionPayout = async (commissionPayout: ICommissionPayoutDocument) => {
  try {
    const commissionPayoutWithPopulatedUser: ICommissionPayoutDocument[] = await getCommissionPayoutWithPopulatedUser(commissionPayout);
    const user = commissionPayoutWithPopulatedUser[0]?.user as IUserDocument;

    if (!user?.integrations?.marqeta) {
      throw new CustomError(`User with commission payout: ${commissionPayout} does not have a marqeta integration.`);
    }

    await createPushUserNotificationFromUserAndPushData(user, {
      pushNotificationType: PushNotificationTypes.REWARD_DEPOSIT,
      body: `$${commissionPayout.amount.toFixed(2)} in Karma Cash has been deposited onto your Karma Wallet Card`,
      title: 'Karma Cash Was Deposited',
    });
  } catch (e) {
    console.log(`Error creating payout push notification: ${e}`);
  }
};

export const createPayoutNotificationsFromCommissionPayout = async (
  commissionPayout: ICommissionPayoutDocument,
  channels: NotificationChannelEnumValue[],
): Promise<(IUserNotificationDocument | void
  )[]> => (
  await Promise.all(
    channels.map(async (channel) => {
      switch (channel) {
        case NotificationChannelEnum.Email:
          return createPayoutEmailNotificationFromCommissionPayout(commissionPayout);
        case NotificationChannelEnum.Push:
          return createPayoutPushNotificationFromCommissionPayout(commissionPayout);
        default:
          return null;
      }
    }),
  )
).filter((notification) => !!notification);

export const createProvisionalCreditPermanentNotification = async (
  chargebackTransition: IChargebackDocument,
): Promise<IUserNotificationDocument | void> => {
  try {
    // use aggreagte pipeline to include the whole user document
    const transaction = (await TransactionModel.aggregate()
      .match({
        'integrations.marqeta.token': chargebackTransition.integrations.marqeta.transaction_token,
      })
      .lookup({
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      })
      .unwind({
        path: '$user',
      })) as unknown as ITransactionDocument & { user: IUserDocument };

    if (!transaction || !transaction?.user?._id) {
      throw Error(`Error creating notification for chargeback transition: ${chargebackTransition}`);
    }

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.CaseWonProvisionalCreditAlreadyIssued,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: transaction?.user?.id?.toString(),
        data: {
          name: transaction?.user?.name,
          submittedClaimDate: `${chargebackTransition.integrations.marqeta.created_time}`,
          amount: `${transaction.amount}`,
          chargebackToken: chargebackTransition.integrations.marqeta.token,
          merchantName: transaction?.integrations?.marqeta?.card_acceptor?.name || transaction?.integrations?.marqeta?.merchant?.name,
        },
      } as CreateNotificationRequest<ICaseWonProvisionalCreditAlreadyIssuedNotificationData>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<IPayoutNotificationData>>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating payout notification: ${e}`);
  }
};

export const createKarmaCardWelcomeUserNotification = async (
  user: IUserDocument,
  newUser: boolean,
): Promise<IUserNotificationDocument | void> => {
  try {
    const existingNotification = await UserNotificationModel.findOne({
      user: user._id,
      type: NotificationTypeEnum.KarmaCardWelcome,
      status: UserNotificationStatusEnum.Unread,
      channel: NotificationChannelEnum.Email,
    });
    if (existingNotification) return;
    const mockRequest = {
      body: {
        type: NotificationTypeEnum.KarmaCardWelcome,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          newUser,
        },
      } as CreateNotificationRequest<IKarmaCardWelcomeData>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<IKarmaCardWelcomeData>>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating karma card welcome notification: ${e}`);
  }
};

export const createACHInitiationUserNotification = async (
  transferData: IACHTransferEmailData,
): Promise<IUserNotificationDocument | void> => {
  try {
    const { user, amount, accountMask, accountType, date } = transferData;

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.ACHTransferInitiation,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          amount: `$${amount}`,
          accountMask,
          accountType,
          date,
        },
      } as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating ACH initiation notification: ${e}`);
  }
};

export const createNoChargebackRightsUserNotification = async (
  chargebackDocument: IChargebackDocument,
): Promise<IUserNotificationDocument | void> => {
  try {
    const transactionToken = chargebackDocument?.integrations?.marqeta.transaction_token;
    if (!transactionToken) {
      throw new CustomError(`Transaction token not found for chargeback: ${chargebackDocument._id}`);
    }
    const transaction = await getExistingTransactionFromChargeback(chargebackDocument);
    if (!transaction) {
      throw new CustomError(`Transaction not found for chargeback: ${chargebackDocument._id}`);
    }
    const user = await UserModel.findById(transaction.user);
    const merchantName = transaction.integrations.marqeta.card_acceptor.name;

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.NoChargebackRights,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          amount: `$${transaction.amount}`,
          merchantName,
        },
      } as unknown as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;

    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating no chargeback rights user notification: ${e}`);
  }
};

export const createCaseLostProvisionalCreditNotAlreadyIssuedUserNotification = async (
  chargebackDocument: IChargebackDocument,
): Promise<IUserNotificationDocument | void> => {
  try {
    const transactionToken = chargebackDocument?.integrations?.marqeta.transaction_token;
    if (!transactionToken) {
      throw new CustomError(`Transaction token not found for chargeback: ${chargebackDocument._id}`);
    }
    const transaction = await getExistingTransactionFromChargeback(chargebackDocument);
    if (!transaction) {
      throw new CustomError(`Transaction not found for chargeback: ${chargebackDocument._id}`);
    }
    const user = await UserModel.findById(transaction.user);
    const companyName = transaction.integrations.marqeta.card_acceptor.name;

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.CaseLostProvisionalCreditNotAlreadyIssued,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          amount: `$${transaction.amount}`,
          companyName,
          date: dayjs(transaction.date).utc().format('MM/DD/YYYY'),
          reason: chargebackDocument.integrations.marqeta.reason,
        },
      } as unknown as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;

    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating case lost provisional credit not already issued notification: ${e}`);
  }
};

export const createCaseLostProvisionalCreditIssuedUserNotification = async (
  chargebackDocument: IChargebackDocument,
): Promise<IUserNotificationDocument | void> => {
  try {
    const transactionToken = chargebackDocument?.integrations?.marqeta.transaction_token;
    if (!transactionToken) {
      throw new CustomError(`Transaction token not found for chargeback: ${chargebackDocument._id}`);
    }
    const transaction = await getExistingTransactionFromChargeback(chargebackDocument);
    if (!transaction) {
      throw new CustomError(`Transaction not found for chargeback: ${chargebackDocument._id}`);
    }
    const user = await UserModel.findById(transaction.user);
    const companyName = transaction.integrations.marqeta.card_acceptor.name;
    const reversalDate = dayjs(transaction.date).utc().add(5, 'days').format('MM/DD/YYYY');

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.CaseLostProvisionalCreditAlreadyIssued,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          amount: `$${transaction.amount}`,
          companyName,
          date: dayjs(transaction.date).utc().format('MM/DD/YYYY'),
          reversalDate,
          reason: chargebackDocument.integrations.marqeta.reason,
        },
      } as unknown as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;

    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating case lost provisional credit issued notification: ${e}`);
  }
};

export const createProvisionalCreditIssuedUserNotification = async (
  transaction: ITransactionDocument,
): Promise<IUserNotificationDocument | void> => {
  const user = await UserModel.findById(transaction.user);
  if (!user) throw new CustomError(`User not found for transaction: ${transaction._id}`);
  const todayDate = dayjs().utc().format('MM/DD/YYYY');

  try {
    const mockRequest = {
      body: {
        type: NotificationTypeEnum.ProvisionalCreditIssued,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user._id.toString(),
        data: {
          name: user.name,
          amount: `$${transaction.amount}`,
          date: todayDate,
        },
      } as unknown as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating Provisional Credit Issued notification: ${e}`);
  }
};

export const createBankLinkedConfirmationNotification = async (
  user: IUserDocument,
  instituteName: string,
  lastDigitsOfBankAccountNumber: string,
): Promise<IUserNotificationDocument | void> => {
  try {
    const mockRequest = {
      body: {
        type: NotificationTypeEnum.BankLinkedConfirmation,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          instituteName,
          lastDigitsOfBankAccountNumber,
        },
      } as CreateNotificationRequest<IBankLinkedConfirmationEmailData>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<IBankLinkedConfirmationEmailData>>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating bank linked confirmation notification: ${e}`);
  }
};

export const createCaseWonProvisionalCreditNotAlreadyIssuedUserNotification = async (
  chargebackDocument: IChargebackDocument,
): Promise<IUserNotificationDocument | void> => {
  try {
    const transactionToken = chargebackDocument?.integrations?.marqeta.transaction_token;
    if (!transactionToken) {
      throw new CustomError(`Transaction token not found for chargeback: ${chargebackDocument._id}`);
    }
    const transaction = await getExistingTransactionFromChargeback(chargebackDocument);
    if (!transaction) {
      throw new CustomError(`Transaction not found for chargeback: ${chargebackDocument._id}`);
    }
    const user = await UserModel.findById(transaction.user);
    const { name } = user;
    const companyName = transaction.integrations.marqeta.card_acceptor.name;
    const { date, amount } = transaction;

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.CaseWonProvisionalCreditNotAlreadyIssued,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name,
          amount,
          companyName,
          date,
        },
      } as unknown as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;

    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating case won provisional credit not already issued notification: ${e}`);
  }
};

export const createDisputeReceivedNoProvisionalCreditIssuedUserNotification = async (
  chargebackDocument: IChargebackDocument,
): Promise<IUserNotificationDocument | void> => {
  try {
    const transactionToken = chargebackDocument?.integrations?.marqeta.transaction_token;
    if (!transactionToken) {
      throw new CustomError(`Transaction token not found for chargeback: ${chargebackDocument._id}`);
    }
    const transaction = await getExistingTransactionFromChargeback(chargebackDocument);
    if (!transaction) {
      throw new CustomError(`Transaction not found for chargeback: ${chargebackDocument._id}`);
    }
    const user = await UserModel.findById(transaction.user);
    const { name } = user;
    const mockRequest = {
      body: {
        type: NotificationTypeEnum.DisputeReceivedNoProvisionalCreditIssued,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name,
        },
      },
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;
    return createUserNotification(mockRequest);
  } catch (err) {
    console.log(`Error creating dispute received no provisional credit issued: ${err}`);
  }
};

export const createCardShippedUserNotification = async (
  webhookData: IMarqetaWebhookCardsEvent,
): Promise<IUserNotificationDocument | void> => {
  try {
    const { user_token } = webhookData;
    const user = await UserModel.findOne({ 'integrations.marqeta.userToken': user_token });
    if (!user) throw new CustomError(`User not found for webhook data: ${webhookData}`);
    const mockRequest = {
      body: {
        type: NotificationTypeEnum.CardShipped,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
        },
      } as unknown as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;

    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating card shipped notification: ${e}`);
  }
};

export const createACHTransferCancelledUserNotification = async (
  transferData: IACHTransferEmailData,
): Promise<IUserNotificationDocument | void> => {
  try {
    const { user, amount, accountMask, accountType, date } = transferData;

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.ACHTransferCancelled,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          amount: `$${amount}`,
          accountMask,
          accountType,
          date,
        },
      } as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating ACH cancelled email notification: ${e}`);
  }
};

export const createACHTransferReturnedUserNotification = async (
  transferData: IACHTransferEmailData,
): Promise<IUserNotificationDocument | void> => {
  try {
    const { user, amount, accountMask, accountType, date, reason } = transferData;

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.ACHTransferReturned,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          amount: `$${amount}`,
          accountMask,
          accountType,
          date,
          reason,
        },
      } as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating ACH returned email notification: ${e}`);
  }
};

export const createPendingReviewKarmaWalletCardUserNotification = async (
  pendingReviewData: IKarmaCardUpdateData,
): Promise<IUserNotificationDocument | void> => {
  try {
    const mockRequest = {
      body: {
        type: NotificationTypeEnum.KarmaCardPendingReview,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        data: pendingReviewData,
        user: pendingReviewData?.user?._id?.toString?.() || undefined,
        visitor: pendingReviewData?.visitor?._id?.toString?.() || undefined,
      } as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;
    if (!!pendingReviewData.user) {
      mockRequest.body.user = pendingReviewData.user._id.toString();
    }

    if (!!pendingReviewData.visitor) {
      mockRequest.body.visitor = pendingReviewData.visitor._id.toString();
    }

    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating Karma Wallet application declined email: ${e}`);
  }
};

export const createDeclinedKarmaWalletCardUserNotification = async (
  declinedData: IKarmaCardDeclinedData,
): Promise<IUserNotificationDocument | void> => {
  try {
    const mockRequest = {
      body: {
        type: NotificationTypeEnum.KarmaCardDeclined,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        data: declinedData,
        user: declinedData?.user?._id?.toString?.() || undefined,
        visitor: declinedData?.visitor?._id?.toString?.() || undefined,
      } as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;
    if (!!declinedData.user) {
      mockRequest.body.user = declinedData.user._id.toString();
    }

    if (!!declinedData.visitor) {
      mockRequest.body.visitor = declinedData.visitor._id.toString();
    }

    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating Karma Wallet application declined email: ${e}`);
  }
};

export const createResumeKarmaCardApplicationUserNotification = async (
  data: IResumeKarmaCardEmailData,
): Promise<IUserNotificationDocument | void> => {
  try {
    const mockRequest = {
      body: {
        type: NotificationTypeEnum.ResumeKarmaCardApplication,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: data?.user?._id?.toString?.() || undefined,
        visitor: data?.visitor?._id?.toString?.() || undefined,
        data,
      } as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;

    return createUserNotification(mockRequest);
  } catch (err) {
    console.log(`Error creating resume karma card application user notification: ${err}`);
  }
};

export const createLowBalancePushNotification = async (user: IUserDocument) => {
  try {
    await createPushUserNotificationFromUserAndPushData(user, {
      pushNotificationType: PushNotificationTypes.LOW_BALANCE,
      body: 'Reload your Karma Wallet Card in-app to continue using it!',
      title: 'Your account balance has dipped below $50.',
    });
  } catch (e) {
    console.log(`Error creating low balance push notification: ${e}`);
  }
};

export const createLowBalanceEmailNotification = async (
  user: IUserDocument,
): Promise<IUserNotificationDocument | void> => {
  try {
    const mockRequest = {
      body: {
        type: NotificationTypeEnum.LowBalance,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
        },
      } as CreateNotificationRequest,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating notification: ${e}`);
  }
};
