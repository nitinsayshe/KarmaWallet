import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { ContactUsModel } from '../../models/contactUs';
import { IVisitorDocument, VisitorModel } from '../../models/visitor';
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

export interface ISubmitContactUsEmailRequest extends IRequest {
  id?: string;
  message: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  topic: Topic;
}

interface IContactUsDBEntry {
  user: string;
  visitor: string;
  message: string;
  topic: Topic;
  email: string;
  emailSentTo: string;
  phone?: string;
  userName?: string;
}

const supportTopicGroups = [Topic.Support, Topic.Other];
const marketingTopicGroups = [Topic.Press, Topic.Inf, Topic.B2B, Topic.Employer, Topic.NonProfit];
const dataTopicGroups = [Topic.Data];

export const submitContactUsEmail = async (req: IRequest<{}, {}, ISubmitContactUsEmailRequest>) => {
  let visitor: IVisitorDocument;
  let user: string;

  const { message, email, phone, firstName, lastName, topic, id } = req.body;

  if (!firstName) throw new CustomError('A first name is required.', ErrorTypes.INVALID_ARG);
  if (!email) throw new CustomError('An email is required.', ErrorTypes.INVALID_ARG);
  if (!message) throw new CustomError('A message is required.', ErrorTypes.INVALID_ARG);
  if (!topic) throw new CustomError('A topic is required.', ErrorTypes.INVALID_ARG);

  if (!!id) {
    user = id;
  } else {
    try {
      visitor = await VisitorModel.findOne({ email });

      if (!visitor) {
        visitor = await createCreateAccountVisitor({ email });
      }
    } catch (error) {
      throw new CustomError('An error occurred while creating a visitor.', ErrorTypes.UNPROCESSABLE);
    }
  }

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

  try {
    const contactUsDbEntryInfo: IContactUsDBEntry = {
      user,
      message,
      visitor: visitor?._id,
      topic,
      email,
      emailSentTo: recipientEmail,
      userName: `${firstName}${lastName ? ` ${lastName}` : ''}`,
    };

    if (phone) {
      contactUsDbEntryInfo.phone = phone;
    }

    const contactUsDBEntry = new ContactUsModel(contactUsDbEntryInfo);
    await contactUsDBEntry.save();
  } catch (error) {
    throw new CustomError('An error occurred while saving the contact us entry.', ErrorTypes.UNPROCESSABLE);
  }

  await sendContactUsEmail({
    recipientEmail,
    department,
    visitor,
    user,
    topic,
    firstName,
    lastName,
    email,
    message,
    phone,
  });

  return 'success';
};
