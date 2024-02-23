import { MainBullClient } from '../../../clients/bull/main';
import { CardNetwork } from '../../../lib/constants';
import { JobNames } from '../../../lib/constants/jobScheduler';
import { IUserDocument } from '../../../models/user';

export const getNetworkFromBin = (bin: string): CardNetwork | null => {
  const binPrefix = bin.slice(0, 2);
  if (!binPrefix) {
    return null;
  }
  if (binPrefix === '34') {
    return CardNetwork.Amex;
  }
  if (binPrefix === '37') {
    return CardNetwork.Amex;
  }
  if (binPrefix[0] === '4') {
    return CardNetwork.Visa;
  }
  if (binPrefix[0] === '5') {
    return CardNetwork.Mastercard;
  }
  if (binPrefix[0] === '6') {
    return CardNetwork.Discover;
  }
  return null;
};

export const executeOrderKarmaWalletCardsJob = (userDocument: IUserDocument) => {
  MainBullClient.createJob(
    JobNames.OrderKarmaWalletCards,
    userDocument,
    {
      delay: 1 * 60 * 1000,
      jobId: `${JobNames.OrderKarmaWalletCards}-${userDocument._id}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 4 * 1000,
      },
    },
  );
};
