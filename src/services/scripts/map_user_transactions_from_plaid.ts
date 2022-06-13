import { isValidObjectId } from 'mongoose';
import { PlaidMapper } from '../../integrations/plaid/mapper';
import { CardModel } from '../../models/card';

export const mapUserTransactionsFromPlaid = async (userId: string, daysInPast: number) => {
  if (!userId) throw new Error('a userId is required');
  if (!isValidObjectId(userId)) throw new Error('invalid user id. please the check the user id and try again.');
  if (daysInPast > 730) throw new Error('invalid daysInPast. cannot be greater than 730 days (2 years).');

  const userCards = await CardModel.find({ userId, 'integrations.plaid': { $ne: null }, status: 'linked' });

  if (!userCards.length) throw new Error('test user not found');

  const mapper = new PlaidMapper();
  await mapper.mapTransactionsFromPlaid(userCards.map(c => c.integrations.plaid.accessToken));

  if (!mapper.transactions.length) {
    const message = 'no transactions received from plaid';
    console.log(message);
    return { message };
  }

  await mapper.mapSectorsToTransactions();
  await mapper.mapTransactionsToCompanies();
  await mapper.saveTransactions();
  await mapper.saveSummary();
};
