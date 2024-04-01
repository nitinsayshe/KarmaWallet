import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { IRequest } from '../../types/request';
import { sendContactUsEmail } from '../email';

enum Topic {
  Support = 'support',
  Press = 'press',
  Inf = 'influencerAffiliateProgram',
  B2B = 'partnership',
  Employer = 'employerProgram',
  NonProfit = 'nonProfitPartnership',
  Data = 'dataPartner',
  Other = 'other'
}

export interface ISubmitContactUsEmailRequest {
  message: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  topic: Topic;
}

export const submitContactUsEmail = async (req: IRequest<{}, {}, ISubmitContactUsEmailRequest>) => {
  const { message, email, phone, firstName, lastName, topic } = req.body; //eslint-disable-line

  if (!firstName) throw new CustomError('A first name is required.', ErrorTypes.INVALID_ARG);
  if (!email) throw new CustomError('An email is required.', ErrorTypes.INVALID_ARG);
  if (!message) throw new CustomError('A message is required.', ErrorTypes.INVALID_ARG);
  if (!topic) throw new CustomError('A topic is required.', ErrorTypes.INVALID_ARG);

  sendContactUsEmail({
    message,
    email,
    phone,
    firstName,
    lastName,
    topic,
    name: `${firstName} ${lastName}`,
  });
  // send email to approriate team
  console.log('Sending email to support team');
  return { success: true, data: req.body };
};
