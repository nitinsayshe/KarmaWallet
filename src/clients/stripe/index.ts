import { Stripe } from 'stripe';
import { getRandomInt } from '../../lib/number';
import { sleep } from '../../lib/misc';

export const sendHttpRequestWithRetry = async (
  sendRequestFunction: () => Promise<Stripe.Response<Stripe.Response<any>>>,
  initialRetries = 3,
  retries = 3,
): Promise<Stripe.Response<any>> => {
  try {
    return await sendRequestFunction();
  } catch (err) {
    const stripeError = err as Stripe.StripeRawError;
    if (!!stripeError && stripeError?.statusCode === 429) {
      if (retries <= 0) throw err;
      console.error('Error sending Stripe http request: ');
      console.error(JSON.stringify(stripeError));
      console.error(`Retrying request. Retries left: ${retries}`);

      const MaximumBackoffMs = 60000;
      const randomNumMiliseconds = getRandomInt(1, 1000);
      const n = initialRetries + 1 - retries;
      const backoffTime = Math.min(2 ** n + randomNumMiliseconds, MaximumBackoffMs);
      await sleep(backoffTime);
      return sendHttpRequestWithRetry(sendRequestFunction, initialRetries, retries - 1);
    }
    throw err;
  }
};
