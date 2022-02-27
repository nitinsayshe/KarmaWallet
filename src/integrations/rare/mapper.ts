import { CompanyModel } from '../../models/company';
import { UserModel } from '../../models/user';
import CustomError, { asCustomError } from '../../lib/customError';
import { ErrorTypes } from '../../lib/constants';
import { Card } from './card';
import { IRareTransaction, Transaction } from './transaction';

export class RareTransactionMapper {
  _rareTransactions: IRareTransaction[] = [];
  _transactions: Transaction[] = [];

  constructor(rareTransactions: IRareTransaction[] = []) {
    this._rareTransactions = rareTransactions;
  }

  get transactions() { return this._transactions; }

  mapTransactions = async () => {
    try {
      // TODO: update to Rare ID when in DB
      const rare = await CompanyModel.findOne({ companyId: 15302 });

      for (const transaction of this._rareTransactions) {
        // TODO: update this to structure returned from rare
        // api once we have confirmed what that structure will
        // look like
        // TODO: update to use ObjectId (new users)
        const user = await UserModel.findOne({ legacyId: transaction.user.external_id });

        // TODO: update this to structure returned from rare
        // api once we have confirmed what that structure will
        // look like
        if (!user) throw new CustomError(`User with id ${transaction.user.external_id} not found.`, ErrorTypes.NOT_FOUND);

        // TODO: update this to structure returned from rare
        // api once we have confirmed what that structure will
        // look like
        if (!!user.integrations?.rare?.userId) {
          // ensure that the rare userId matches the one we have stored
          // if does not, will need to notify rare and figure out which id should be used
        } else {
          if (!user.integrations) user.integrations = {};
          if (!user.integrations.rare) user.integrations.rare = {};

          // TODO: update this to structure returned from rare
          // api once we have confirmed what that structure will
          // look like
          user.integrations.rare.userId = transaction.user.user_id;
          await user.save();
        }

        transaction.amt /= 100;

        const card = new Card(user, transaction.card);
        await card.load();
        await card.save();

        const _transaction = new Transaction(user, rare, card, transaction);
        await _transaction.load();
        await _transaction.save();
        this._transactions.push(_transaction);

        //    ??? how to handle carbonMultiplier for these?
        //    ??? how are we planning on treating carbonMultiplier for plaid transactions for Rare? just have a 0/null?
      }
    } catch (err) {
      console.log(err);
      throw asCustomError(err);
    }
  };
}
