import { TransactionModel } from '../../models/transaction';
import { CardModel } from '../../models/card';
import { UserModel } from '../../models/user';
import CustomError, { asCustomError } from '../../lib/customError';
import { RareTransactionMapper } from './mapper';
import { IRareTransaction } from './transaction';
import { IGroupDocument } from '../../models/group';

export const mapTransactions = async (rareTransactions: IRareTransaction[] = [], isMatch: boolean = false, group: IGroupDocument = null) => {
  try {
    if (!rareTransactions.length) throw new CustomError('No rare transactions found. Exiting.');

    console.log('mapping rare transactions...');

    const mapper = new RareTransactionMapper(rareTransactions);
    await mapper.mapTransactions(isMatch, group);

    if (mapper.transactions.length) {
      console.log(`[+] ${mapper.transactions.length}/${rareTransactions.length} rare transactions mapped\n`);
    } else {
      throw new CustomError('Uh Oh, something went wrong. No rare transactions were mapped.');
    }
  } catch (err) {
    console.log(err);
    throw asCustomError(err);
  }
};

export const reset = async () => {
  try {
    await TransactionModel.deleteMany({ 'integrations.rare': { $exists: true } });
    await CardModel.deleteMany({ 'integrations.rare': { $exists: true } });
    const users = await UserModel.find({ 'integrations.rare': { $exists: true } });
    for (const user of users) {
      delete user.integrations.rare;
      await user.save();
    }
  } catch (err) {
    console.log(err);
    throw asCustomError(err);
  }
};
