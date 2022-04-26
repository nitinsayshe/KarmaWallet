/* eslint-disable camelcase */
/* eslint-disable no-restricted-syntax */
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import csv from 'csvtojson';
import util from 'util';
import { parse } from 'json2csv';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Transaction as PlaidTransaction, TransactionsGetResponse } from 'plaid';
import { ObjectId } from 'mongoose';
import { printTable } from '../logger';
import User from './user';
import { CompanyModel } from '../../models/company';
import { CardModel, ICardDocument } from '../../models/card';
import { IMatchedCompanyNameDocument, MatchedCompanyNameModel } from '../../models/matchedCompanyName';
import { IUnmatchedCompanyNameDocument, UnmatchedCompanyNameModel } from '../../models/unmatchedCompanyName';
import { PlaidCategoryMappingModel } from '../../models/plaidCategoryMapping';
import { IntegrationMappingSummaryModel } from '../../models/integrationMappingSummary';
import Transaction from './transaction';
import { CardStatus } from '../../lib/constants';
import { PlaidClient } from '../../clients/plaid';
import { TransactionModel } from '../../models/transaction';
import { CategoryModel } from '../../models/category';
import { SubcategoryModel } from '../../models/subcategory';
import { IPlaidCategoriesToSectorMappingDocument, PlaidCategoriesToSectorMappingModel } from '../../models/plaidCategoriesToKarmaSectorMapping';

const pythonScriptPath = path.join(__dirname, '..', '..', 'lib', 'companyTextMatch.py');

dayjs.extend(utc);

const execAsync = util.promisify(exec);

export class PlaidMapper {
  _plaidItems: TransactionsGetResponse[] = [];
  _users: { [key: string]: User } = {};

  _totalTransactions = 0;
  _transactions: Transaction[] = [];
  _totalCards = 0;
  _totalAccessTokens = 0;
  _unmappedTransactionsIndex = new Set();
  _unmappedTransactions: PlaidTransaction[] = [];
  _duplicateUnmappedTransactions: PlaidTransaction[] = [];
  _duplicateTransactions: PlaidTransaction[] = [];
  _existingMatches: IMatchedCompanyNameDocument[] = [];
  _existingCompanyMatchesCount = 0;
  _newTransactionsSaved = 0;
  _updatedTransactionsSaved = 0;
  _transactionsNotMappedAtAll = 0;
  _newMatchedToCompany = 0;
  _unmatchedToCompany = 0;
  _plaidSectorMappings: IPlaidCategoriesToSectorMappingDocument[] = [];
  _startTimestamp: Date = null;
  constructor(plaidItems: TransactionsGetResponse[] = [], transactions: Transaction[] = []) {
    this._startTimestamp = dayjs().toDate();
    this._plaidItems = plaidItems;
    this._transactions = transactions;
  }

  get totalCards() {
    let count = 0;
    Object.values(this._users).forEach(user => {
      count += Object.values(user.cards).length;
    });

    return count;
  }

  get transactions() {
    if (!this._transactions.length) {
      Object.values(this._users).forEach(user => {
        Object.values(user.cards).forEach(card => {
          card.transactions.forEach(transaction => {
            this._transactions = [...this._transactions, transaction];
          });
        });
      });
    }

    return this._transactions;
  }

  buildMatches = async ({
    transactionsDb = path.join(__dirname, '.tmp', 'transactions.csv'),
    brandDb = path.join(__dirname, '.tmp', 'companies.csv'),
    manualMatch = path.resolve(__dirname, '.tmp', 'Manual_matches.csv'),
    falsePos = path.join(__dirname, '.tmp', 'False_pos.csv'),
    thresh1 = 0.444,
    thresh2 = 0.938,
  }) => new Promise((res, rej) => {
    try {
      console.time('matching algo');
      const process = spawn('python3', [pythonScriptPath, '--matched_unique', path.join(__dirname, '.tmp', 'matchedUnique'), '--unmatched', path.join(__dirname, '.tmp', 'unmatched'), '--transaction_db', transactionsDb, '--brand_db', brandDb, '--Manual_match', manualMatch, '--False_pos', falsePos, '--threshold_1', `${thresh1}`, '--threshold_2', `${thresh2}`]);

      let out: string;
      if (process && process.stdout) {
        (process.stdout as any).on('data', (data: any) => {
          const str = data.toString().trim();
          out += str;
        });
      }

      if (process && process.stderr) {
        const err: string[] = [];
        (process.stderr as any).on('data', (data: any) => err.push(data.toString()));

        process.on('exit', (code) => {
          if (code === 0) {
            res(out);
            console.timeEnd('matching algo');
          } else {
            rej(new Error(err.join('\n')));
          }
        });
      }
    } catch (e) {
      console.log(e);
    }
  });

  // these transactions matched other transactions that had
  // already been mapped to a user's card.
  cacheDuplicateTransactions = (dups: PlaidTransaction[]) => {
    this._duplicateTransactions = [...this._duplicateTransactions, ...dups];
  };

  // these transactions could not be mapped to a user's card for some reason.
  cacheUnmappedTransactions = (unmapped: PlaidTransaction[]) => {
    for (const um of unmapped) {
      if (!this._unmappedTransactionsIndex.has(um.transaction_id)) {
        this._unmappedTransactionsIndex.add(um.transaction_id);
        this._unmappedTransactions.push(um);
      } else {
        this._duplicateUnmappedTransactions.push(um);
      }
    }
  };

  incrementSavedTransactionCount = (kind: 'new' | 'update') => {
    if (kind === 'new') {
      this._newTransactionsSaved += 1;
    } else {
      this._updatedTransactionsSaved += 1;
    }
  };

  mapSectorsToTransactions = async () => {
    console.log(`\nmapping categories to ${this.transactions.length} transactions...`);
    this._plaidSectorMappings = await PlaidCategoriesToSectorMappingModel.find().lean();

    for (const transaction of this.transactions) {
      let plaidCategoriesId: string;
      if (transaction._plaidTransaction?.category) {
        plaidCategoriesId = transaction._plaidTransaction?.category.map(x => x.trim().split(' ').join('-')).filter(x => !!x).join('-');
      }

      let mapping: IPlaidCategoriesToSectorMappingDocument;

      if (!!plaidCategoriesId) mapping = this._plaidSectorMappings.find(psm => psm.plaidCategoriesId === plaidCategoriesId);

      if (!!mapping && !transaction.sector) {
        transaction.setSector(mapping.sector as ObjectId);
      }
    }

    console.log('[+] categories mapped to transactions\n');
  };

  mapItems = async () => {
    console.log('\nmapping cards and transactions...');
    for (const item of this._plaidItems) {
      // if new user, need to create
      if (!this._users[`${item.userId}`]) {
        this._users[`${item.userId}`] = new User(item);
      }
      await this._users[`${item.userId}`].load();

      this._totalTransactions += item.transactions.length;
      const { unmappedTransactions, duplicateTransactions } = await this._users[`${item.userId}`].addCards(item);
      this.cacheUnmappedTransactions(unmappedTransactions);
      this.cacheDuplicateTransactions(duplicateTransactions);
    }

    console.log('[+] cards and transactions mapped\n');
  };

  mapPlaidCategoriesToKarmaCategoriesAndCarbonMultiplier = async () => {
    const co2Path = path.join(__dirname, '.tmp', 'co2_emissions.csv');
    const categoriesMapPath = path.join(__dirname, '.tmp', 'categories_map.csv');
    const co2: {
      category: string[];
      CO2: number;
    }[] = await csv().fromFile(co2Path);
    const categories: {
      plaid_category: string[];
      category: string;
      subCategory: string
    }[] = await csv().fromFile(categoriesMapPath);

    const obj: {
      [key: string]: {
        plaid_categories: string[];
        carbonMultiplier: number;
      }
    } = {};

    for (const item of co2) {
      const str = item.category.map(x => x.trim().split(' ').join('-')).filter((x: string) => !!x).join('-');
      obj[str] = {
        plaid_categories: item.category,
        carbonMultiplier: item.CO2,
      };
    }

    const _categories: {
      [key: string]: number;
    } = {};

    for (const category of categories) {
      const str = category.plaid_category.map(x => x.trim().split(' ').join('-')).filter(x => !!x).join('-');
      if (!!obj[str]) {
        let _category: number = null;
        let _subcategory: number = null;

        // TODO: replace this with new sector structure
        if (category.category) {
          // use cached version
          _category = _categories[category.category];
          // ...or pull from db if not cached
          if (!_category) {
            const _categoryInstance = await CategoryModel.findOne({ name: category.category }).lean();

            if (!!_categoryInstance) {
              _category = _categoryInstance._id;

              // cache result if found
              _categories[category.category] = _category;
            }
          }
        }

        // TODO: replace this with new sector structure
        if (category.subCategory) {
          // use cached version
          _subcategory = _categories[category.subCategory];
          // ...or pull from db if not cached
          if (!_subcategory) {
            const _subcategoryInstance = await SubcategoryModel.findOne({ name: category.subCategory }).lean();

            if (!!_subcategoryInstance) {
              _subcategory = _subcategoryInstance._id;

              // cache result if found
              _categories[category.subCategory] = _subcategory;
            }
          }
        }

        try {
          const pcm = new PlaidCategoryMappingModel({
            ...obj[str],
            plaidCategoriesId: str,
            category: _category,
            subCategory: _subcategory,
          });

          await pcm.save();
        } catch (err: any) {
          console.log(err.message);
        }
      }
    }

    console.log('\n[+] categories and carbon multiplier mapped to plaid categories\n');
  };

  /**
   * will retrieve transactions from plaid and map their
   * data to the IK structure.
   *
   * if an array of access tokens is provided, only the
   * transactions for those access tokens will be mapped.
   * otherwise, all transactions for all currently linked
   * cards will be mapped.
   */
  mapTransactionsFromPlaid = async (acs: string[] = [], daysInPast = 90) => {
    const endDate = dayjs();
    const startDate = endDate.subtract(daysInPast, 'day');
    this._transactions = [];

    let accessTokens;
    let cards: ICardDocument[] = [];

    console.log('\nretrieving cards and accessTokens...');
    // get access tokens from cards (using Set will remove any dups)
    if (Array.isArray(acs) && acs.length) {
      accessTokens = new Set(acs);
      cards = await CardModel.find({ 'integrations.plaid.accessToken': { $in: acs } });
    } else {
      cards = await CardModel.find({ status: CardStatus.Linked });
      accessTokens = new Set(cards.map(card => card.integrations?.plaid?.accessToken).filter(card => !!card));
    }
    this._totalCards = cards.length;
    console.log(`[+] ${cards.length} cards and ${accessTokens.size} access tokens retrieved\n`);

    this._totalAccessTokens = accessTokens.size;

    console.log('retrieving transactions from Plaid...');
    const Plaid = new PlaidClient();
    for (const accessToken of Array.from(accessTokens)) {
      let plaidTransactions = null;
      try {
        plaidTransactions = await Plaid.getPlaidTransactions({
          access_token: accessToken,
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD'),
        });
      } catch (err) {
        // TODO: update card status here...need to look at possible errors from Plaid.
        // ??? send email to user advising that one or more of their cards has become unlinked ???
        for (const card of cards) {
          try {
            if (card.integrations?.plaid?.accessToken === accessToken) {
              card.status = CardStatus.Unlinked;
              card.integrations.plaid.accessToken = null;
              await card.save();
            }
          } catch { /* swallowing error so iterations aren't interrupted */ }
        }
      }

      if (!plaidTransactions?.length) continue;

      try {
        this._transactions = [
          ...this._transactions,
          ...plaidTransactions
            .map(transaction => {
              const card = cards.find(c => {
                if (!c.integrations?.plaid) return null;
                return c.integrations.plaid.accessToken === accessToken && c.integrations.plaid.accountId === transaction.account_id;
              });

              if (!card) return null;

              return new Transaction((card.userId as ObjectId), card._id, transaction);
            })
            .filter(card => !!card),
        ];

        for (const card of cards) {
          if (card.integrations?.plaid?.accessToken === accessToken) {
            card.status = CardStatus.Linked;
            await card.save();
          }
        }
      } catch (err: any) {
        console.log('\n[-] Error mapping Plaid transactions to Karma Transactions');
        console.log(err.message);
        console.log('\n');
      }
    }

    this._totalTransactions += this._transactions.length;
    console.log(`[+] ${this._transactions.length} transactions retrieved from Plaid`);
  };

  mapTransactionsToExistingCompanyMatches = async () => {
    const existingMatchedTransactions: Transaction[] = [];
    const existingUnmatchedTransactions: Transaction[] = [];

    let manualMatches: IMatchedCompanyNameDocument[] = await MatchedCompanyNameModel.find({ manualMatch: true }).lean();
    this._existingMatches = await MatchedCompanyNameModel.find({ manualMatch: false }).lean();

    if (!manualMatches.length) {
      console.log('loading static manual matches into db...');
      // indicates is the first run of this job and needs to load all existing
      // static manual matches from the csv...this should not need to happen on
      // subsequent runs of this job
      await this.writeStaticManualMatchesToDb();
      manualMatches = await MatchedCompanyNameModel.find({ manualMatch: true }).lean();
      console.log('[+] static manual matches loaded successfully');
    }

    if (!this._existingMatches.length) {
      console.log('loading static false positives into db...');
      // indicates is the first run of this job and needs to load all existing
      // static false positive from the csv...this should not need to happen on
      // subsequent runs of this job

      const falsePos = await this.writeStaticFalsePosToDb();

      this._existingMatches = [...this._existingMatches, ...falsePos];
      console.log('[+] static false positives loaded successfully');
    }

    await Promise.all(this.transactions.map(async (transaction) => {
      let match = manualMatches.find(m => (transaction.name === m.original && !m.falsePositive)
          || (transaction.merchant_name === m.original && !m.falsePositive));

      if (!match) {
        match = this._existingMatches.find(m => (transaction.name === m.original && !m.falsePositive)
          || (transaction.merchant_name === m.original && !m.falsePositive));
      }

      if (!!match) {
        if (!match.manualMatch || !transaction.company) {
          transaction.setCompany(match.companyId || null);
        }

        existingMatchedTransactions.push(transaction);
      } else {
        existingUnmatchedTransactions.push(transaction);
      }
    }));

    return { existingMatchedTransactions, existingUnmatchedTransactions };
  };

  // 1. create the .tmp directory so the match algorithm can run
  // 2. iterate over ALL the transactions and map them to existing company name matches
  // 3. write the transaction that didnt match an existing company to a .csv so match algorithm can consume
  // 4. write all companies in the db to a .csv so match algorithm can consume
  // 5. execute the match algorithm
  // 6. read output of match algorithm from .csvs (matches and unmatches)
  // 7. read all the unmatched company name counts from the db
  // 8. look over the unmatched output from algorithm, and see if any already exist in the db...if so, increment their counts
  // 9. iterate over all unmapped transactions, map any company name matches to them, and then save.
  // 10. write any matches from algorithm to db
  // 11. write all new unmatch counts to db
  // 12. clean up .tmp
  mapTransactionsToCompanies = async () => {
    try {
      console.log('\nmapping transactions to companies...');

      const tmp = path.join(__dirname, '.tmp');
      if (!fs.existsSync(tmp)) {
        const { stderr } = await execAsync(`mkdir ${tmp}`);
        if (stderr) throw new Error(stderr);
      }

      const { existingMatchedTransactions, existingUnmatchedTransactions } = await this.mapTransactionsToExistingCompanyMatches();

      this._existingCompanyMatchesCount = existingMatchedTransactions.length;

      printTable('EXISTING MATCHES', [
        { group: 'Matched\t\t\t', count: `${existingMatchedTransactions.length}\t\t` },
        { group: 'Unmatched\t\t\t', count: `${existingUnmatchedTransactions.length}\t\t` },
      ]);

      // writing any transactions that failed match with existing company matches to csv for use in matches.py
      this.writeTransactionsToCsv(existingUnmatchedTransactions);

      // required for .py script to consume content
      await this.writeCompaniesToCsv();
      await this.writeManualMatchesToCsv();
      await this.writeFalsePosToCsv();

      console.log('\nrunning matches algorithm...');
      await this.buildMatches({});
      console.log('[+] matches compiled');

      const matches = await this.readMatchedContents();
      const unmatches = await this.readUnmatchedContents();

      // increment totals for unmatches in db
      const existingUnmatchCounts: IUnmatchedCompanyNameDocument[] = await UnmatchedCompanyNameModel.find({});
      const newUnmatchCounts = await Promise.all(unmatches.filter(async (u) => {
        const found = existingUnmatchCounts.find(eum => eum.original === u.original);

        if (!!found) {
          // this is not an accurate total...
          // confirmed with Anushkay, does not need to be...
          // is only used to identify high priority companies.
          // eslint-disable-next-line radix
          const count = parseInt(u.count);
          if (!Number.isNaN(count)) {
            found.count += count;
            found.lastModified = dayjs().utc().toDate();
          }
          await found.save();
        }

        return !found;
      }));

      console.log('\nmatching companies to transactions...');

      await Promise.all(existingUnmatchedTransactions.map(async (transaction) => {
        const match = matches.find(m => m.original === transaction.name || m.original === transaction.merchant_name);
        if (!!match) {
          transaction.setCompany(match._id);
        } else {
          this._transactionsNotMappedAtAll += 1;
        }
      }));

      // write the new matches to the db
      await Promise.all(matches.map(async (m) => {
        const matchFound = this._existingMatches.find(e => e.original === m.original && e.companyName === m.companyName);

        if (!matchFound) {
          const match = new MatchedCompanyNameModel({
            original: m.original,
            companyName: m.companyName,
            companyId: `${m._id}`,
            createdOn: dayjs.utc().format(),
          });
          await match.save();
        }
      }));

      // update unmatched counts in db
      const existingUnmatchedCompanies: IUnmatchedCompanyNameDocument[] = await UnmatchedCompanyNameModel.find({}).lean();
      await Promise.all(newUnmatchCounts.map(async (u) => {
        const matchFound = existingUnmatchedCompanies.find(e => e.original === u.original);

        if (!matchFound) {
          const unmatch = new UnmatchedCompanyNameModel({
            ...u,
            createdOn: dayjs.utc().format(),
          });
          await unmatch.save();
        }
      }));

      this._newMatchedToCompany = matches.length;
      this._unmatchedToCompany = unmatches.length;

      printTable('COMPANY MATCHES', [
        { group: 'Matched\t\t\t', count: `${matches.length}\t\t` },
        { group: 'Unmatched\t\t\t', count: `${unmatches.length}\t\t` },
      ]);
      console.log('* The Matched group only includes new matches found in this set of transactions. It does not include matches previously identified and stored in the dictionary in our db.');

      console.log('\ncleaning up...');
      // cleanup .tmp
      // const { stderr: stderr2 } = await execAsync(`rm -rf ${tmp}`);
      // if (stderr2) throw new Error(stderr2);
      console.log('[+] transactions mapped to companies successfully');
    } catch (err) {
      console.log('>>>>> error mapping transactions to companies');
      console.log(err);
    }
  };

  printSummary = () => {
    let newCards = 0;
    let updatedCards = 0;

    for (const user of Object.values(this._users)) {
      for (const card of Object.values(user.cards)) {
        if (card.isNew) {
          newCards += 1;
        } else {
          updatedCards += 1;
        }
      }
    }

    printTable('CARDS', [
      { group: 'Total Cards\t\t\t', count: `${this.totalCards}\t\t` },
      { group: 'New Cards\t\t\t', count: `${newCards}\t\t` },
      { group: 'Updated Cards\t\t\t', count: `${updatedCards}\t\t` },
    ]);

    printTable('TRANSACTIONS', [
      { group: 'Unmapped to Card Transactions\t', count: `${this._unmappedTransactions.length}\t\t` },
      { group: 'New Transactions Saved\t', count: `${this._newTransactionsSaved}\t\t` },
      { group: 'Updated Transactions Saved\t', count: `${this._updatedTransactionsSaved}\t\t` },
      { group: 'Total Transactions\t\t', count: `${this._totalTransactions}\t\t` },
    ]);

    printTable('MISC', [
      { group: 'Total Plaid Items\t\t', count: `${this._plaidItems.length}\t\t` },
      { group: 'Total Users\t\t\t', count: `${Object.keys(this._users).length}\t\t` },
    ]);
  };

  readMatchedContents = async () => {
    const matchesPath = path.join(__dirname, '.tmp', 'matchedUnique.csv');
    const matches = await csv().fromFile(matchesPath);
    return matches;
  };

  readUnmatchedContents = async () => {
    const matchesPath = path.join(__dirname, '.tmp', 'unmatched.csv');
    const matches = await csv().fromFile(matchesPath);
    return matches;
  };

  saveSummary = async () => {
    try {
      console.log('writing job summary to db...');

      const summary = new IntegrationMappingSummaryModel();
      summary.source = 'plaid';
      summary.totalCards = this.totalCards || this._totalCards || 0;
      summary.totalAccessTokens = this._totalAccessTokens ?? 0;
      summary.totalTransactions = this._totalTransactions ?? 0;
      summary.existingCompanyMatches = this._existingCompanyMatchesCount ?? 0;
      summary.newMatchedToCompany = this._newMatchedToCompany ?? 0;
      summary.unmatchedToCompany = this._unmatchedToCompany ?? 0;
      summary.newTransactions = this._newTransactionsSaved ?? 0;
      summary.updatedTransactions = this._updatedTransactionsSaved ?? 0;
      summary.startTimestamp = this._startTimestamp;
      summary.endTimestamp = dayjs().toDate();
      await summary.save();

      console.log('[+] job summary written to db');
    } catch (err) {
      console.log('[-] failed to write summary to db');
    }
  };

  saveTransactions = async () => {
    console.log(`\nsaving ${this.transactions.length} transactions...`);
    for (const transaction of this.transactions) {
      await transaction.save(this.incrementSavedTransactionCount);
    }
    console.log('[+] transactions saved\n');
  };

  writeCompaniesToCsv = async () => {
    const companies = await CompanyModel.find({ 'hidden.status': false }).select('companyName').lean();
    const fields = ['companyName', '_id'];
    const opts = { fields };
    try {
      const _csv = parse(companies, opts);
      fs.writeFileSync(path.join(__dirname, '.tmp', 'companies.csv'), _csv);
    } catch (err) {
      console.error(err);
    }
  };

  writeFalsePosToCsv = async () => {
    const falsePos = await MatchedCompanyNameModel.find({ falsePositive: true }).lean();
    const fields = ['original', 'companyName'];
    const opts = { fields };
    try {
      const _csv = parse(falsePos, opts);
      fs.writeFileSync(path.join(__dirname, '.tmp', 'False_pos.csv'), _csv);
    } catch (err) {
      console.error(err);
    }
  };

  writeManualMatchesToCsv = async () => {
    const manualDocuments: IMatchedCompanyNameDocument[] = await MatchedCompanyNameModel.find({ manualMatch: true }).lean();
    const manual = manualDocuments.map(m => ({
      original: m.original,
      companyName: m.companyName,
      _id: m.companyId,
    }));

    const fields = ['original', 'companyName', '_id'];
    const opts = { fields };
    try {
      const _csv = parse(manual, opts);
      fs.writeFileSync(path.join(__dirname, '.tmp', 'Manual_matches.csv'), _csv);
    } catch (err) {
      console.error(err);
    }
  };

  // adds the fake positive matches from the .csv on the first execution of
  // this mapper.
  writeStaticFalsePosToDb = async () => {
    const falsePosPath = path.join(__dirname, '.tmp', 'orig_False_pos.csv');
    const falsePositives: {
      original: string;
      companyName: string;
    }[] = await csv().fromFile(falsePosPath);
    const existingMatches: IMatchedCompanyNameDocument[] = await MatchedCompanyNameModel.find({});

    for (const falsePositive of falsePositives) {
      const data = {
        original: falsePositive.original,
        companyName: falsePositive.companyName,
      };

      const matchFound = existingMatches.find(e => e.original === data.original
          && e.companyName === data.companyName);

      if (!!matchFound) {
        matchFound.falsePositive = true;
        await matchFound.save();
      } else {
        const f = new MatchedCompanyNameModel({
          ...data,
          falsePositive: true,
          createdOn: dayjs.utc().format(),
        });

        await f.save();
      }
    }

    return falsePositives as IMatchedCompanyNameDocument[];
  };

  // adds the manual matches from the .csv on the first execution of this mapper.
  writeStaticManualMatchesToDb = async () => {
    const manualMatchesPath = path.join(__dirname, '.tmp', 'orig_Manual_matches.csv');
    const manualMatches = await csv().fromFile(manualMatchesPath);
    const existingMatches: IMatchedCompanyNameDocument[] = await MatchedCompanyNameModel.find({}).lean();

    for (const match of manualMatches) {
      const data = {
        original: match.original,
        companyName: match.companyName,
        companyId: `${match._id}`,
      };

      const matchFound = existingMatches.find(e => e.original === data.original
          && e.companyName === data.companyName
          && e.companyId.toString() === data.companyId);

      if (!matchFound) {
        const company = await CompanyModel.findOne({ legacyId: data.companyId, 'hidden.status': false });
        const m = new MatchedCompanyNameModel({
          original: match.original,
          companyName: match.companyName,
          companyId: company,
          manualMatch: true,
          createdOn: dayjs.utc().format(),
        });

        await m.save();
      }
    }

    return manualMatches;
  };

  writeTransactionsToCsv = (transactions: Transaction[]) => {
    try {
      const _csv = parse(transactions.map(t => t.plaidTransaction));
      fs.writeFileSync(path.join(__dirname, '.tmp', 'transactions.csv'), _csv);
    } catch (err) {
      console.error(err);
    }
  };

  reset = async () => {
    await CardModel.deleteMany({});
    await IntegrationMappingSummaryModel.deleteMany({});
    await MatchedCompanyNameModel.deleteMany({});
    await PlaidCategoryMappingModel.deleteMany({});
    await UnmatchedCompanyNameModel.deleteMany({});
    await TransactionModel.deleteMany({});
  };
}
