import { Transaction as PlaidTransaction, TransactionsGetResponse } from 'plaid';
import { UserModel, IUserDocument } from '../../models/user';
import Card from './card';

class User {
  // the user object from the database
  _user: IUserDocument = null;
  // owner of this collection of cards
  _userId: string = null;
  // all cards the user has linked
  _cards: {[key: string]: Card} = {};
  constructor(plaidItem: TransactionsGetResponse) {
    this._userId = `${plaidItem.userId}`;
  }

  get userId() { return this._user._id; }
  get cards() { return this._cards; }

  /**
   * adds or updates any cards found to the user's collection of cards
   *
   * @param {Object} plaidAccounts - array of plaid account objects
   */
  addCards = async (plaidItem: TransactionsGetResponse) => {
    let unmappedTransactions = plaidItem.transactions;
    let duplicates: PlaidTransaction[] = [];

    for (const account of plaidItem.accounts) {
      if (!!this._cards[`${account.id}`]) {
        // updating an existing card
        this._cards[`${account.id}`].update(account, plaidItem);
      } else {
        // creating a new card for this user
        this._cards[`${account.id}`] = new Card(this.userId, account, plaidItem);
      }

      await this._cards[`${account.id}`].save();

      const results = await this._cards[`${account.id}`].mapTransactions(unmappedTransactions);
      duplicates = [...duplicates, ...results.duplicateTransactions];
      unmappedTransactions = results.unmappedTransactions;
    }

    return { unmappedTransactions, duplicateTransactions: duplicates };
  };

  load = async () => {
    if (!this._user) {
      this._user = await UserModel.findOne({ legacyId: this._userId });

      if (!this._user) throw new Error(`User ${this._userId} not found.`);
    }
  };
}
export default User;
