import { PlaidClient } from '../../clients/plaid';
import { CardStatus } from '../../lib/constants';
import { CardModel } from '../../models/card';
import { TransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { UserGroupModel } from '../../models/userGroup';
import { UserImpactTotalModel } from '../../models/userImpactTotals';
import { UserLogModel } from '../../models/userLog';
import { UserMontlyImpactReportModel } from '../../models/userMonthlyImpactReport';
import { UserTransactionTotalModel } from '../../models/userTransactionTotals';
import { cancelAllUserSubscriptions } from '../marketing_subscription';

export interface IDeleteUserParams {
  userId?: string;
  email?: string;
}

export const deleteUser = async ({ userId, email }: IDeleteUserParams) => {
  const user = await UserModel.findOne({ $or: [{ _id: userId }, { 'emails.email': email }] });
  if (!user) throw new Error('User not found');
  await cancelAllUserSubscriptions(user._id.toString());

  const userGroups = await UserGroupModel.find({ user: user._id });
  if (userGroups.length) throw new Error('User is a member of a group');
  console.log('Deleting user', user._id);
  // Removing Cards and Unlinking Access Tokens
  const cards = await CardModel.find({ userId: user._id });
  const plaidClient = new PlaidClient();
  for (const card of cards) {
    if (card.status === CardStatus.Linked) await plaidClient.invalidateAccessToken({ access_token: card.integrations.plaid.accessToken });
    await CardModel.deleteOne({ _id: card._id });
  }
  // Removing Transacitons
  await TransactionModel.findOne({ user: user._id });
  // Removing Other Data/Reports
  await UserImpactTotalModel.deleteOne({ user: user._id });
  await UserLogModel.deleteMany({ userId: user._id });
  await UserMontlyImpactReportModel.deleteMany({ user: user._id });
  await UserTransactionTotalModel.deleteMany({ user: user._id });
  await UserModel.deleteOne({ _id: user._id });
};
