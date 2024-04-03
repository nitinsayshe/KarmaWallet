import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { IRequest } from '../../types/request';
import { sendContactUsEmail } from '../email';
import { createCreateAccountVisitor } from '../visitor';

export enum Topic {
  Support = 'Support',
  Press = 'Press',
  Inf = 'Influencer/Affiliate Program',
  B2B = 'B2B Partnership',
  Employer = 'Employer Program',
  NonProfit = 'Non-Profit Partnership',
  Data = 'Data Partner',
  Other = 'Other'
}

const supportTopicGroups = [Topic.Support, Topic.Other];
const marketingTopicGroups = [Topic.Press, Topic.Inf, Topic.B2B, Topic.Employer, Topic.NonProfit];
const dataTopicGroups = [Topic.Data];

export interface ISubmitContactUsEmailRequest extends IRequest{
  id?: string;
  message: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  topic: Topic;
}

export const submitContactUsEmail = async (req: IRequest<{}, {}, ISubmitContactUsEmailRequest>) => {
  let visitorId;

  const { message, email, phone, firstName, lastName, topic, id } = req.body;

  if (!!id) {
    // const user = await UserModel.findOne({ _id: id });
    visitorId = id;
  } else {
    try {
      const visitor = await createCreateAccountVisitor({ email });
      visitorId = visitor._id;
    } catch (error) {
      throw new CustomError('An error occurred while creating a visitor.', ErrorTypes.UNPROCESSABLE);
    }
  }

  if (!firstName) throw new CustomError('A first name is required.', ErrorTypes.INVALID_ARG);
  if (!email) throw new CustomError('An email is required.', ErrorTypes.INVALID_ARG);
  if (!message) throw new CustomError('A message is required.', ErrorTypes.INVALID_ARG);
  if (!topic) throw new CustomError('A topic is required.', ErrorTypes.INVALID_ARG);

  let recipientEmail;
  let department;

  if (supportTopicGroups.includes(topic)) {
    recipientEmail = 'support@karmawallet.io';
    department = 'Support Team at Karma Wallet';
  } else if (marketingTopicGroups.includes(topic)) {
    recipientEmail = 'marketing@karmawallet.io';
    department = 'Marketing Team at Karma Wallet';
  } else if (dataTopicGroups.includes(topic)) {
    recipientEmail = 'data@karmawallet.io';
    department = 'Data Team at Karma Wallet';
  }

  sendContactUsEmail({
    recipientEmail,
    department,
    visitor: visitorId,
    topic,
    firstName,
    lastName,
    email,
    message,
    phone,
  });

  return 'success';
};
