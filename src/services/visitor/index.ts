import isemail from 'isemail';
import { FilterQuery } from 'mongoose';
import { updateActiveCampaignListStatus } from '../../integrations/activecampaign';
import * as HubspotIntegration from '../../integrations/hubspot';
import { ErrorTypes } from '../../lib/constants';
import { InterestCategoryToSubscriptionCode, SubscriptionCodeToProviderProductId } from '../../lib/constants/subscription';
import CustomError from '../../lib/customError';
import { ISubscription, SubscriptionModel } from '../../models/subscription';
import { IUserDocument, UserModel } from '../../models/user';
import { IVisitorDocument, VisitorModel } from '../../models/visitor';
import { IRequest } from '../../types/request';
import { ActiveCampaignListId, SubscriptionCode, SubscriptionStatus } from '../../types/subscription';

const shareableSignupError = 'Error subscribing to the provided subscription code. Could be due to existing subscriptions that would conflict with this request.';
const shareableInterestFormSubmitError = 'Error submitting the provided form data.';

export interface INewsletterSignupData {
  email: string;
  subscriptionCode: SubscriptionCode;
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

const enrollInMonthlyNewsletterCampaign = async (email: string, subscribe: ActiveCampaignListId[], unsubscribe: ActiveCampaignListId[]) => {
  try {
    await updateActiveCampaignListStatus(email, subscribe, unsubscribe);
  } catch (err) {
    console.error(`Error updating active campaign list subscriptions for visitor with email ${email}:`, err);
    throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
  }
};

const createVisitorWithEmail = async (email: string): Promise<IVisitorDocument> => {
  try {
    return await VisitorModel.create({ email });
  } catch (err) {
    console.error(`Error creating visitor with email ${email}:`, err);
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

export const newsletterSignup = async (_: IRequest, email: string, subscriptionCode: SubscriptionCode) => {
  try {
    if (!email || !isemail.validate(email, { minDomainAtoms: 2 })) {
      throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
    }
    email = email.toLowerCase();

    const code = SubscriptionCode[subscriptionCode];
    if (!code) {
      throw new CustomError(shareableSignupError, ErrorTypes.GEN);
    }

    const productId = SubscriptionCodeToProviderProductId[code] as ActiveCampaignListId;
    if (!productId) {
      throw new CustomError(shareableSignupError, ErrorTypes.GEN);
    }

    const user = await getUserByEmail(email);
    if (!!user) {
      throw new CustomError(shareableSignupError, ErrorTypes.GEN);
    }

    let visitor = await getVisitorByEmail(email);
    if (visitor) {
      // if visitor has already subscribed to this newsletter, throw error
      const previousSubscription = await getSubscriptionByQuery(
        { $and: [
          { visitor: visitor._id },
          { code },
        ] },
      );
      if (previousSubscription) {
        throw new CustomError(shareableSignupError, ErrorTypes.GEN);
      }
    } else {
      visitor = await createVisitorWithEmail(email);
      if (!visitor) {
        throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
      }
    }

    // TODO: Eror handling... reconciliation process??? since this is using the bulk import endpoint under the hood?
    // We don't get  a succss/fail response from active campaign immediately
    await enrollInMonthlyNewsletterCampaign(email, [productId], []);

    // log this subscription in the db
    const subscription = await createSubscription({
      code: subscriptionCode,
      visitor: visitor._id,
      status: SubscriptionStatus.Active,
    });
    if (!subscription) {
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
