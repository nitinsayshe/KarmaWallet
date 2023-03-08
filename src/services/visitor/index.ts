import isemail from 'isemail';
import { FilterQuery } from 'mongoose';
import { updateActiveCampaignListStatus } from '../../integrations/activecampaign';
import * as HubspotIntegration from '../../integrations/hubspot';
import * as TokenService from '../token';
import { emailVerificationDays, ErrorTypes, TokenTypes } from '../../lib/constants';
import { InterestCategoryToSubscriptionCode, SubscriptionCodeToProviderProductId } from '../../lib/constants/subscription';
import CustomError from '../../lib/customError';
import { getUtcDate } from '../../lib/date';
import { ISubscription, SubscriptionModel } from '../../models/subscription';
import { IUserDocument, UserModel } from '../../models/user';
import { IVisitorDocument, VisitorModel } from '../../models/visitor';
import { IRequest } from '../../types/request';
import { ActiveCampaignListId, SubscriptionCode, SubscriptionStatus } from '../../types/subscription';
import { sendAccountCreationVerificationEmail } from '../email';
import { IUrlParam } from '../user';

const shareableSignupError = 'Error subscribing to the provided subscription code. Could be due to existing subscriptions that would conflict with this request.';
const shareableInterestFormSubmitError = 'Error submitting the provided form data.';

export interface IVisitorSignupData {
  email: string;
  params?: IUrlParam[];
}

export interface INewsletterSignupData extends IVisitorSignupData {
  subscriptionCodes: SubscriptionCode[];
}

export interface ICreateAccountRequest extends IVisitorSignupData {
  groupCode?: string;
  shareASale?: boolean;
}

const getUserByEmail = async (email: string): Promise<IUserDocument> => {
  try {
    return await UserModel.findOne({ 'emails.email': email });
  } catch (err) {
    console.error(`Error searching for user with email ${email}:`, err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

const getVisitorByEmail = async (email: string): Promise<IVisitorDocument> => {
  try {
    return await VisitorModel.findOne({ email });
  } catch (err) {
    console.error(`Error searching for visitor with email ${email}:`, err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

const getSubscriptionByQuery = async (query: FilterQuery<ISubscription>): Promise<ISubscription> => {
  try {
    return await SubscriptionModel.findOne(query);
  } catch (err) {
    console.error('Error searching for subscription:', err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

const getSubscriptionsByQuery = async (query: FilterQuery<ISubscription>): Promise<ISubscription[]> => {
  try {
    return await SubscriptionModel.find(query);
  } catch (err) {
    console.error('Error searching for subscription:', err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

const enrollInMonthlyNewsletterCampaign = async (email: string, subscribe: ActiveCampaignListId[], unsubscribe: ActiveCampaignListId[]) => {
  try {
    await updateActiveCampaignListStatus(email, subscribe, unsubscribe);
  } catch (err) {
    console.error(`Error updating active campaign list subscriptions for visitor with email ${email}:`, err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

// send email to confirm email for account creationg
export const sendAccountCreationEmail = async (visitor: IVisitorDocument, email: string) => {
  const days = emailVerificationDays;
  email = email?.toLowerCase();
  if (!isemail.validate(email, { minDomainAtoms: 2 })) throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
  try {
    const token = await TokenService.createVisitorToken({ visitor, days, type: TokenTypes.Email, resource: { email } });
    await sendAccountCreationVerificationEmail({ token: token.value, recipientEmail: email, name: 'createAccount' });
    return `Verfication instructions have been sent to your provided email address. This token will expire in ${days} days.`;
  } catch (err) {
    console.log('Error creating token for email verification', err);
    throw err;
  }
};

// Endpoint for user to request account creation
const createCreateAccountVisitor = async (info: ICreateAccountRequest): Promise<IVisitorDocument> => {
  try {
    console.log('////// this is the visitor info', info);
    const visitorInfo: any = {
      email: info.email,
    };

    if (!!info.groupCode || (!!info.params && !!info.params.length) || !!info.shareASale) {
      visitorInfo.integrations = {};
      console.log('////// there are params');
      if (!!info.groupCode) visitorInfo.integrations.groupCode = info.groupCode;
      if (!!info.params) visitorInfo.integrations.params = info.params;
      if (!!info.shareASale) visitorInfo.integrations.shareASale = info.shareASale;
    }
    const visitor = await VisitorModel.create(visitorInfo);
    return visitor;
  } catch (err) {
    throw new CustomError(`Error creating visitor: ${err} `, ErrorTypes.SERVER);
  }
};

const createVisitorWithEmail = async (email: string, params: IUrlParam[]): Promise<IVisitorDocument> => {
  try {
    const data: any = { email };
    if (!!params && !!params.length) data.integrations = { params };
    return await VisitorModel.create(data);
  } catch (err) {
    console.error(`Error creating visitor with email ${email}:`, err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

const createSubscriptions = async (subscriptions: Partial<ISubscription>[]): Promise<ISubscription[]> => {
  try {
    return await SubscriptionModel.insertMany(subscriptions);
  } catch (err) {
    console.error('Error creating new subscription:', err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

const createSubscription = async (subscription: Partial<ISubscription>): Promise<ISubscription> => {
  try {
    return await SubscriptionModel.create(subscription);
  } catch (err) {
    console.error('Error creating new subscription:', err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

export const getQueryFromSubscriptionCodes = (visitorId: string, codes: SubscriptionCode[]): FilterQuery<ISubscription> => {
  const query: FilterQuery<ISubscription> = { $or: [] };
  codes.forEach((code) => {
    query.$or.push(
      { $and: [
        { visitor: visitorId },
        { code },
      ] },
    );
  });
  return query;
};

export const createAccountForm = async (_:IRequest, data: ICreateAccountRequest) => {
  try {
    console.log('[+] Create Account', data);
    const { groupCode, shareASale, params } = data;
    let { email } = data;

    if (!email || !isemail.validate(email, { minDomainAtoms: 2 })) {
      throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
    }

    email = email.toLowerCase();
    const user = await getUserByEmail(email);

    if (!!user) {
      throw new CustomError('Email already associated with a user. Please sign in or request a password reset.', ErrorTypes.GEN);
    }

    let visitor = await getVisitorByEmail(email);

    if (!!visitor) {
      throw new CustomError('This email has already requested an account. Please check your email to verify and finish account creation.', ErrorTypes.GEN);
    } else {
      visitor = await createCreateAccountVisitor({ groupCode, shareASale, params, email });
      console.log('/////// should have created a visitor', visitor);
      if (!visitor) {
        throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
      } else {
        try {
          const emailSent = await sendAccountCreationEmail(visitor, email);
          console.log('/////// this is the email sent', emailSent);
        } catch (err) {
          console.log('/////// there was an error sending an email', err);
        }

        return 'A verification email has been sent. Please check your email to finish account creation.';
      }
    }
  } catch (err) {
    console.log('Error sending email to validate account.', err);
    throw err;
  }
};

export const newsletterSignup = async (_: IRequest, email: string, subscriptionCodes: SubscriptionCode[], params?: IUrlParam[]) => {
  try {
    if (!email || !isemail.validate(email, { minDomainAtoms: 2 })) {
      throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
    }

    email = email.toLowerCase();

    if (!subscriptionCodes || !subscriptionCodes.length) {
      throw new CustomError(shareableSignupError, ErrorTypes.GEN);
    }

    // Check that the subscription code is valid and maps to a valid provider product id
    const productIds = subscriptionCodes.map((code) => {
      const c = SubscriptionCode[code];
      if (!c) {
        throw new CustomError(shareableSignupError, ErrorTypes.GEN);
      }

      const productId = SubscriptionCodeToProviderProductId[c] as ActiveCampaignListId;
      if (!productId) {
        throw new CustomError(shareableSignupError, ErrorTypes.GEN);
      }
      return productId;
    });

    const user = await getUserByEmail(email);
    if (!!user) {
      throw new CustomError(shareableSignupError, ErrorTypes.GEN);
    }

    let visitor = await getVisitorByEmail(email);
    if (visitor) {
      // if visitor has already subscribed to these codes, throw error
      const query = getQueryFromSubscriptionCodes(visitor._id, subscriptionCodes);
      const previousSubscriptions = await getSubscriptionsByQuery(query);
      if (!!previousSubscriptions && previousSubscriptions.length === subscriptionCodes.length) {
        throw new CustomError(shareableSignupError, ErrorTypes.GEN);
      }
    } else {
      visitor = await createVisitorWithEmail(email, params);
      if (!visitor) {
        throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
      }
    }

    // TODO: Eror handling... reconciliation process??? since this is using the bulk import endpoint under the hood?
    // We don't get  a succss/fail response from active campaign immediately
    await enrollInMonthlyNewsletterCampaign(email, productIds, []);

    // log this subscription in the db
    const subscriptions = await createSubscriptions(
      subscriptionCodes.map((c) => {
        const sub: Partial<ISubscription> = { visitor: visitor._id, code: c, status: SubscriptionStatus.Active, lastModified: getUtcDate().toDate() };
        return sub;
      }),
    );

    if (!subscriptions || !subscriptions.length) {
      throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
    }
  } catch (err) {
    console.log('Error subscribing to newsletter', err);
    throw err;
  }
};

const createVisitorIfDoesNotExist = async (email: string): Promise<IVisitorDocument> => {
  try {
    return await VisitorModel.findOneAndUpdate({ email }, { email }, { new: true, upsert: true });
  } catch (err) {
    console.error(`Error creating or retrieving user with email ${email}:`, err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

const submitFormToHubspot = async (req: HubspotIntegration.InterestFormRequest) => {
  try {
    await HubspotIntegration.submitInterestForm(req);
  } catch (err) {
    console.error('Error submitting form data to hubspot:', err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

export const submitInterestForm = async (_: IRequest, data: HubspotIntegration.InterestFormRequest) => {
  const { email } = data;
  try {
    if (!email || !isemail.validate(email, { minDomainAtoms: 2 })) {
      throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
    }
    data.email = email.toLowerCase();

    if (!(data.interestCategory as HubspotIntegration.InterestCategory)) {
      throw new CustomError('Invalid interest category.', ErrorTypes.INVALID_ARG);
    }

    const code = InterestCategoryToSubscriptionCode[data.interestCategory];
    if (!code) {
      throw new CustomError('Error processing request', ErrorTypes.SERVER);
    }

    let visitor = null;
    const user = await getUserByEmail(email);
    if (!user) {
      visitor = await createVisitorIfDoesNotExist(email);
    }

    if (!user && !visitor) {
      throw new Error('Error creating visitor');
    }

    const previousSubscription = await getSubscriptionByQuery(
      { $and: [
        { $or: [
          { visitor: visitor?._id },
          { user: user?._id },
        ] },
        { code },
      ] },
    );
    if (!!previousSubscription) {
      throw new CustomError(shareableInterestFormSubmitError, ErrorTypes.GEN);
    }

    await submitFormToHubspot(data);

    const subscription = await createSubscription({
      code,
      user: user?._id,
      visitor: visitor?._id,
      status: SubscriptionStatus.Active,
    });
    if (!subscription) {
      throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
    }
  } catch (err) {
    console.log('Error submitting form', err);
    throw err;
  }
};
