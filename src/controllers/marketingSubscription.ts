import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as output from '../services/output';
import * as MarketingSubscriptionService from '../services/marketing_subscription';

export const newsletterUnsubscribe: IRequestHandler<{}, {}, MarketingSubscriptionService.INewsletterUnsubscribeData> = async (req, res) => {
  try {
    const { email, preserveSubscriptions } = req.body;
    if (process.env.NODE_ENV !== 'production') return output.api(req, res, null);
    await MarketingSubscriptionService.newsletterUnsubscribe(req, email, preserveSubscriptions);
    output.api(req, res, null);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
