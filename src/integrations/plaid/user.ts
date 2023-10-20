import { FilterQuery, isValidObjectId } from 'mongoose';
import { AccountSubtype, Transaction as PlaidTransaction, TransactionsGetResponse } from 'plaid';
import { UserModel, IUserDocument, IUser } from '../../models/user';
import { createAchFundingSource } from '../marqeta/accountFundingSource';
import Bank from './bank';
import Card from './card';
import { IPlaidItem, IPlaidBankItem } from './types';

class User {
  // the user object from the database
  _user: IUserDocument = null;
  // owner of this collection of cards
  _userId: string = null;
  // all cards the user has linked
  _cards: { [key: string]: Card } = {};
  // all banks the user has linked
  _banks: { [key: string]: Bank } = {};
  constructor(plaidItem: IPlaidItem | TransactionsGetResponse | IPlaidBankItem) {
    this._userId = `${plaidItem.userId}`;
  }

  get userId() { return this._user._id; }
  get cards() { return this._cards; }
  get banks() { return this._banks; }

  /**
   * adds or updates any cards found to the user's collection of cards
   *
   * @param {Object} plaidAccounts - array of plaid account objects
   */
  addCards = async (plaidItem: IPlaidItem | TransactionsGetResponse, skipTransactionMapping?: boolean) => {
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
      if (!skipTransactionMapping) {
        const results = await this._cards[`${account.id}`].mapTransactions(unmappedTransactions);
        duplicates = [...duplicates, ...results.duplicateTransactions];
        unmappedTransactions = results.unmappedTransactions;
      }
    }

    return { unmappedTransactions, duplicateTransactions: duplicates };
  };

  addBanks = async (plaidItem: IPlaidBankItem, preocessorTokens: { accountId: string, processorToken: string }[]) => {
    // get the user , to extract the marqeta userToken
    const user = await UserModel.findById(this.userId);
    const { accounts } = plaidItem;
    const PlaidAccountAllowList = [AccountSubtype.Savings, AccountSubtype.Checking];

    // merge/map the account Obj and processorToke with respect to account_id
    const mapAccountsAndProcessorTokens = accounts.map(account => ({
      ...account,
      processorToken: preocessorTokens.find(item => item.accountId === account.account_id)?.processorToken,
    }));

    for (const account of mapAccountsAndProcessorTokens) {
      if (!!PlaidAccountAllowList.includes(account.subtype as AccountSubtype)) {
        // create marqeta funding source and map data to Karma DB
        const { data } = await createAchFundingSource(this.userId, {
          userToken: user.integrations.marqeta.userToken,
          partnerAccountLinkReferenceToken: account.processorToken,
          partner: 'PLAID',
        }, plaidItem.access_token);

        // add fundingSourceToken to plaidItem
        plaidItem.fundingSourceToken = data.token;

        if (!!this._banks[`${account.account_id}`]) {
          // updating an existing bank
          this._banks[`${account.account_id}`].update(account, plaidItem);
        } else {
          // creating a new bank for this user
          this._banks[`${account.account_id}`] = new Bank(this.userId, account, plaidItem);
        }
        await this._banks[`${account.account_id}`].save();
      }
    }
  };

  load = async () => {
    if (!this._user) {
      const userQuery: FilterQuery<IUser> = isValidObjectId(this._userId)
        ? { _id: this._userId }
        : { legacyId: this._userId };

      this._user = await UserModel.findOne(userQuery);
      if (!this._user) throw new Error(`User ${this._userId} not found.`);
    }
  };
}
export default User;
