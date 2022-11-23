import isemail from 'isemail';
import { updateActiveCampaignListStatus } from '../../integrations/activecampaign';
import { ErrorTypes } from '../../lib/constants';
import { SubscriptionCodeToProviderProductId } from '../../lib/constants/subscription';
import CustomError, { asCustomError } from '../../lib/customError';
import { SubscriptionModel } from '../../models/subscription';
import { UserModel } from '../../models/user';
import { VisitorModel } from '../../models/visitor';
import { IRequest } from '../../types/request';
import { SubscriptionCode, SubscriptionStatus } from '../../types/subscription';

const shareableSignupError = 'Error subscribing to the provided subscription code. Could be due to existing subscriptions that would conflict with this request.';

export interface INewsletterSignupData {
  email: string;
  subscriptionCode: SubscriptionCode;
}
export const newsletterSignup = async (_: IRequest, email: string, subscriptionCode: SubscriptionCode) => {
  try {
    if (!email || !isemail.validate(email, { minDomainAtoms: 2 })) {
      throw new CustomError('Invalid email format.', ErrorTypes.INVALID_ARG);
    }
    email = email.toLowerCase();

    // is this a user email ?
    const user = await UserModel.findOne({ 'emails.email': email });
    if (!!user) {
      throw new CustomError(shareableSignupError, ErrorTypes.GEN);
    }

    // is this a visitor email?
    const visitor = await VisitorModel.findOne({ email });
    if (visitor) {
      throw new CustomError(shareableSignupError, ErrorTypes.GEN);
    }

    const newVisitor = await VisitorModel.create({ email });
    if (!newVisitor) {
      throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
    }

    // insert a new active subscription associated with the new visitor
    const code: SubscriptionCode = SubscriptionCode[subscriptionCode];
    if (!code) {
      throw new CustomError(shareableSignupError, ErrorTypes.GEN);
    }

    const productId = SubscriptionCodeToProviderProductId[code];
    if (!productId) {
      throw new CustomError(shareableSignupError, ErrorTypes.GEN);
    }

    // TODO: Eror handling... reconciliation process??? since this is using the bulk import endpoint under the hood?
    // We don't get  a succss/fail response from active campaign immediately
    await updateActiveCampaignListStatus(email, [productId], []);

    // log this subscription in the db
    const subscription = await SubscriptionModel.create({
      code: subscriptionCode,
      visitor: newVisitor._id,
      status: SubscriptionStatus.Active,
    });
    if (!subscription) {
      throw new CustomError(shareableSignupError, ErrorTypes.SERVER);
    }
  } catch (err) {
    console.log('Error subscribing to newsletter', err);
    throw asCustomError(new CustomError(shareableSignupError, ErrorTypes.SERVER));
  }
};
