import { SafeParseError, z, ZodError } from 'zod';
import { isValidObjectId, Types } from 'mongoose';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationModel,
  NotificationResourceType,
  EarnedCashbackNotificationData,
  PayoutNotificationData,
  INotificationDocument,
  IShareableNotification,
} from '../../models/notification';
import { IRequest } from '../../types/request';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { formatZodFieldErrors, getZodEnumScemaFromTypescriptEnum } from '../../lib/validation';
import { getUtcDate } from '../../lib/date';
import { GroupModel, IGroupDocument } from '../../models/group';
import { ITransactionDocument, TransactionModel } from '../../models/transaction';
import { CommissionPayoutModel, ICommissionPayoutDocument } from '../../models/commissionPayout';
import { IUserDocument, UserModel } from '../../models/user';
import { sendCashbackPayoutEmail, sendEarnedCashbackRewardEmail } from '../email';
import { roundToPercision } from '../../lib/misc';
import { ICommissionDocument, CommissionModel } from '../../models/commissions';
import { ICompanyDocument } from '../../models/company';

export type CreateNotificationRequest<T = undefined> = {
  type: NotificationType;
  status: NotificationStatus;
  channel?: NotificationChannel;
  user: Types.ObjectId;
  resource?: Types.ObjectId;
  body?: string;
  data?: T;
};

export const getShareableNotification = (notification: INotificationDocument): IShareableNotification => ({
  _id: notification._id,
  createdOn: notification.createdOn,
  body: notification.body,
} as IShareableNotification);

const executeNotificaitonEffect = async <DataType>(
  type: NotificationType,
  user: IUserDocument,
  data?: DataType,
  channel: NotificationChannel = NotificationChannel.None,
): Promise<void> => {
  try {
    if (type === NotificationType.Group) {
      // notify all members of the group
    }
    if (type === NotificationType.EarnedCashback) {
      // send earned cashback notification email
      const d = data as unknown as EarnedCashbackNotificationData;
      if (channel === NotificationChannel.Email) {
        await sendEarnedCashbackRewardEmail({
          user: user._id,
          recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
          name: d?.name,
          companyName: d?.companyName,
        });
      }
    }
    if (type === NotificationType.Payout) {
      // send payout notification email
      const d = data as unknown as PayoutNotificationData;
      if (channel === NotificationChannel.Email) {
        await sendCashbackPayoutEmail({
          user: user._id,
          recipientEmail: user?.emails?.find((email) => email?.primary)?.email,
          name: d?.name,
          amount: d?.payoutAmount,
        });
      }
    }
  } catch (err) {
    console.error(err);
    throw new CustomError('Error executing notification effect', ErrorTypes.SERVER);
  }
};

const getResourceByNotificationType = async (
  resourceId: Types.ObjectId,
  type: NotificationType,
): Promise<{
  resource: IGroupDocument | ITransactionDocument | ICommissionPayoutDocument | null;
  resourceType: NotificationResourceType;
} | null> => {
  try {
    switch (type) {
      case NotificationType.Group:
        return { resource: await GroupModel.findById(resourceId), resourceType: NotificationResourceType.Group };
      case NotificationType.EarnedCashback:
        return {
          resource: await TransactionModel.findById(resourceId),
          resourceType: NotificationResourceType.Transaction,
        };
      case NotificationType.Payout:
        return {
          resource: await CommissionPayoutModel.findById(resourceId),
          resourceType: NotificationResourceType.CommissionPayout,
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

const prepareZodCreateNotificationSchema = <DataType>(
  req: CreateNotificationRequest<DataType>,
  hasResource: boolean,
): z.ZodSchema | void => {
  try {
    return z.object({
      type: getZodEnumScemaFromTypescriptEnum(NotificationType),
      status: getZodEnumScemaFromTypescriptEnum(NotificationStatus),
      channel: getZodEnumScemaFromTypescriptEnum(NotificationChannel).optional(),
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

export const saveNotification = async (notification: INotificationDocument): Promise<INotificationDocument> => {
  try {
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
export const createNotification = async <DataType>(
  req: IRequest<{}, {}, CreateNotificationRequest<DataType>>,
): Promise<INotificationDocument | void> => {
  const { type, status, channel, body, resource, user, data } = req.body;

  const createNotificationSchema = prepareZodCreateNotificationSchema(req.body, !!resource);
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
  let resourceType: NotificationResourceType;
  if (resource) {
    const r = await getResourceByNotificationType(resource, type);
    if (!r || !r?.resource || !r?.resourceType) {
      throw new CustomError('Resource not found', ErrorTypes.NOT_FOUND);
    }
    ({ resource: resourceDoc, resourceType } = r);
  }

  const userDoc = await getUserById(user);
  if (!userDoc) {
    throw new CustomError('User not found', ErrorTypes.NOT_FOUND);
  }

  const notification = new NotificationModel({
    type,
    status,
    channel,
    user: userDoc,
    resource: resourceDoc || undefined,
    resourceType,
    body,
    data,
    createdOn: getUtcDate(),
  });

  await executeNotificaitonEffect(type, userDoc, data, channel);
  return saveNotification(notification);
};

export const createEarnedCashbackNotificationFromCommission = async (
  commission: ICommissionDocument,
  disableEmail = false,
): Promise<INotificationDocument | void> => {
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
        type: NotificationType.EarnedCashback,
        status: NotificationStatus.Unread,
        channel: disableEmail ? undefined : NotificationChannel.Email,
        user: user?._id?.toString(),
        body: `You just earned $${roundToPercision(commission.amount, 2)} in cashback from ${company.companyName}`,
        data: {
          name: user.name,
          companyName: company.companyName,
        },
      } as CreateNotificationRequest<EarnedCashbackNotificationData>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<EarnedCashbackNotificationData>>;
    return createNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating earned cashback notification: ${e}`);
  }
};

export const createPayoutNotificationFromCommissionPayout = async (
  commissionPayout: ICommissionPayoutDocument,
): Promise<INotificationDocument | void> => {
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
        type: NotificationType.Payout,
        status: NotificationStatus.Unread,
        channel: NotificationChannel.Email,
        user: user?._id?.toString(),
        body: `You were sent $${roundToPercision(commissionPayout.amount, 2)} in cashback rewards!`,
        data: {
          name: user.name,
          payoutAmount: `${commissionPayout.amount}`,
        },
      } as CreateNotificationRequest<PayoutNotificationData>,
    } as unknown as IRequest<{}, {}, CreateNotificationRequest<PayoutNotificationData>>;
    return createNotification(mockRequest);
  } catch (e) {
    console.log(`Error creating payout notification: ${e}`);
  }
};
