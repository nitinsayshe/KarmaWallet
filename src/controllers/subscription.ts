import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import * as output from '../services/output';
import * as SubscriptionService from '../services/subscription';

export const newsletterUnsubscribe: IRequestHandler<{}, {}, SubscriptionService.INewsletterUnsubscribeData> = async (req, res) => {
  try {
    const { email, preserveSubscriptions } = req.body;
    if (process.env.NODE_ENV !== 'production') return output.api(req, res, null);
    await SubscriptionService.newsletterUnsubscribe(req, email, preserveSubscriptions);
    output.api(req, res, null);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
