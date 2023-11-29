/* eslint-disable camelcase */
import { isValidObjectId, Types } from 'mongoose';
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
import { formatZodFieldErrors, getZodEnumScemaFromTypescriptEnum } from '../../lib/validation';
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
  IPushNotificationData,
  UserNotificationModel,
  ICaseWonProvisionalCreditAlreadyIssuedNotificationData,
  IKarmaCardWelcomeData,
  IBankLinkedConfirmationEmailData,
} from '../../models/user_notification';
import { IRequest } from '../../types/request';
import { executeUserNotificationEffects } from '../notification';
import { IACHTransferEmailData } from '../email/types';
import { IMarqetaWebhookCardsEvent } from '../../integrations/marqeta/types';

dayjs.extend(utc);

export type CreateNotificationRequest<T = undefined> = {
  type: NotificationTypeEnumValue;
  status: UserNotificationStatusEnumValue;
  channel?: NotificationChannelEnumValue;
  user: Types.ObjectId;
  resource?: Types.ObjectId;
  data?: T;
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
  const payoutNotificaitonDataFields = ['name', 'payoutAmount'];
  const isPayoutNotificationData = Object.keys(data)?.reduce((acc, curr) => {
    if (!(curr in payoutNotificaitonDataFields)) {
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
      type: getZodEnumScemaFromTypescriptEnum(NotificationTypeEnum),
      status: getZodEnumScemaFromTypescriptEnum(UserNotificationStatusEnum),
      channel: getZodEnumScemaFromTypescriptEnum(NotificationChannelEnum).optional(),
      user: z
        .string()
        .refine((val) => isValidObjectId(val), { message: 'Must be a object reference' })
        .optional(),
      resource: z
        .string()
        .refine((val) => isValidObjectId(val), { message: 'Must be a valid object reference' })
        .optional(),
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
  const { type, status, channel, resource, user, data } = req.body;

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

  const userDoc = await getUserById(user);
  if (!userDoc) {
    throw new CustomError('User not found', ErrorTypes.NOT_FOUND);
  }

  const notification = new UserNotificationModel({
    type,
    status,
    channel,
    user: userDoc,
    resource: resourceDoc || undefined,
    resourceType,
    data,
    createdOn: getUtcDate(),
  });

  await executeUserNotificationEffects(notification, userDoc);
  return saveUserNotification(notification);
};

const getNotificationTypeFromPushNotificationType = (pushNotificationType: PushNotificationTypes): NotificationTypeEnumValue | '' => {
  switch (pushNotificationType) {
    case PushNotificationTypes.EARNED_CASHBACK:
      return NotificationTypeEnum.EarnedCashback;
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
    default:
      return '';
  }
};

export const createPushUserNotificationFromUserAndPushData = async (
  user: IUserDocument,
  data: IPushNotificationData,
  disablePush = false,
): Promise<IUserNotificationDocument | void> => {
  try {
    // make sure this data is a push notification type
    const { pushNotificationType, body, title } = data;

    if (!pushNotificationType || !body || !title) {
      throw Error(`Error creating notificaiton for user: ${user}. Missing data: ${data}`);
    }

    const mockRequest = {
      body: {
        type: getNotificationTypeFromPushNotificationType(pushNotificationType),
        status: UserNotificationStatusEnum.Unread,
        channel: disablePush ? undefined : NotificationChannelEnum.Push,
        user: user?._id?.toString(),
        data,
      } as CreateNotificationRequest<IPushNotificationData>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<IPushNotificationData>>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating notification: ${e}`);
  }
};

export const createEarnedCashbackUserNotificationFromCommission = async (
  commission: ICommissionDocument,
  disableEmail = false,
): Promise<IUserNotificationDocument | void> => {
  // get user and company data
  try {
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
      throw Error(`Error creating notificaiton for commission: ${commission}`);
    }

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
        },
      } as CreateNotificationRequest<IEarnedCashbackNotificationData>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<IEarnedCashbackNotificationData>>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating earned cashback notification: ${e}`);
  }
};

export const createPayoutUserNotificationFromCommissionPayout = async (
  commissionPayout: ICommissionPayoutDocument,
): Promise<IUserNotificationDocument | void> => {
  // get user and company data
  try {
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
      throw Error(`Error creating notificaiton for commission payout: ${commissionPayout}`);
    }

    const user = commissionPayoutWithPopulatedUser[0].user as IUserDocument;

    const mockRequest = {
      body: {
        type: NotificationTypeEnum.Payout,
        status: UserNotificationStatusEnum.Unread,
        channel: NotificationChannelEnum.Email,
        user: user?._id?.toString(),
        data: {
          name: user.name,
          body: `You were sent $${roundToPercision(commissionPayout.amount, 2)} in cashback rewards!`,
          payoutAmount: `${commissionPayout.amount}`,
        },
      } as CreateNotificationRequest<IPayoutNotificationData>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<IPayoutNotificationData>>;
    return createUserNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating payout notification: ${e}`);
  }
};

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
      throw Error(`Error creating notificaiton for chargeback transition: ${chargebackTransition}`);
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
    const transaction = await TransactionModel.findOne({ 'integrations.marqeta.token': transactionToken });
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

export const createCaseLostProvisionalCreditIssuedUserNotification = async (
  chargebackDocument: IChargebackDocument,
): Promise<IUserNotificationDocument | void> => {
  try {
    const transactionToken = chargebackDocument?.integrations?.marqeta.transaction_token;
    if (!transactionToken) {
      throw new CustomError(`Transaction token not found for chargeback: ${chargebackDocument._id}`);
    }
    const transaction = await TransactionModel.findOne({ 'integrations.marqeta.token': transactionToken });
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
    const transaction = await TransactionModel.findOne({ 'integrations.marqeta.token': transactionToken });
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
