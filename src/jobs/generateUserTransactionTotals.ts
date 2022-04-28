import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Types } from 'mongoose';
import { ICompanySector } from '../models/company';
import { ISectorDocument } from '../models/sector';
import { TransactionModel } from '../models/transaction';
import { IUserDocument, UserModel } from '../models/user';
import {
  ICompanyTransactionTotals, ISectorTransactionTotals, IUserTransactionTotalDocument, UserTransactionTotalModel,
} from '../models/userTransactionTotals';

dayjs.extend(utc);

/**
 * this file contains all the logic used to calculate
 * user_transaction_totals.
 */

const getTransactions = (userId: Types.ObjectId) => TransactionModel
  .aggregate([
    {
      $match: {
        userId,
      },
    },
    {
      $lookup: {
        from: 'companies',
        localField: 'companyId',
        foreignField: '_id',
        as: 'companyId',
      },
    },
    {
      $addFields: {
        sectors: {
          $reduce: {
            input: '$companyId.sectors',
            initialValue: [],
            in: {
              $concatArrays: [
                '$$value', '$$this.sector',
              ],
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: 'sectors',
        localField: 'sectors',
        foreignField: '_id',
        as: 'popSectors',
      },
    },
    {
      $unwind: {
        path: '$companyId',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        sectors: 0,
      },
    },
  ]);

const getTransactionTotal = (
  user: IUserDocument,
  companyTotals: ICompanyTransactionTotals[],
  allSectorTotals: ISectorTransactionTotals[],
  primarySectorTotals: ISectorTransactionTotals[],
  totalDollars: number,
  totalTransactions: number,
  allTransactionTotals: IUserTransactionTotalDocument[],
) => {
  let transactionTotal = allTransactionTotals.find(att => att.user.toString() === user._id.toString());
  const timestamp = dayjs().utc().toDate();

  if (!!transactionTotal) {
    transactionTotal.groupedByCompany = companyTotals;
    transactionTotal.groupedByAllSectors = allSectorTotals;
    transactionTotal.groupedByPrimarySectors = primarySectorTotals;
    transactionTotal.totalSpent = totalDollars;
    transactionTotal.totalTransactionCount = totalTransactions;
    transactionTotal.lastModified = timestamp;
  } else {
    transactionTotal = new UserTransactionTotalModel({
      user,
      groupedByCompany: companyTotals,
      groupedByAllSectors: allSectorTotals,
      groupedByPrimarySectors: primarySectorTotals,
      totalSpent: totalDollars,
      totalTransactionCount: totalTransactions,
      createdAt: timestamp,
    });
  }

  return transactionTotal;
};

export const exec = async () => {
  console.log('\ngenerating user transaction totals...');

  let grandTotalDollars = 0;
  let grandTotalTransactions = 0;
  let errorCount = 0;
  const grandCompanyTotals: { [key: string]: ICompanyTransactionTotals } = {};
  const grandAllSectorTotals: { [key: string]: ISectorTransactionTotals } = {};
  const grandPrimarySectorTotals: { [key: string]: ISectorTransactionTotals } = {};

  let users: IUserDocument[];
  let allTransactionTotals: IUserTransactionTotalDocument[];
  let appUser: IUserDocument;

  try {
    users = await UserModel.find({});
    allTransactionTotals = await UserTransactionTotalModel.find({});
  } catch (err) {
    console.log('\n[-] error retrieving users and existing transaction totals');
    console.log(err, '\n');
  }

  if (!users || !allTransactionTotals) return;

  for (const user of users) {
    if (user._id.toString() === process.env.APP_USER_ID) {
      appUser = user;
      continue;
    }

    try {
      let userTotalDollars = 0;
      let userTotalTransactions = 0;
      const userCompanyTotals: { [key: string]: ICompanyTransactionTotals } = {};
      const userAllSectorTotals: { [key: string]: ISectorTransactionTotals } = {};
      const userPrimarySectorTotals: { [key: string]: ISectorTransactionTotals } = {};

      const transactions = await getTransactions(user._id);

      if (!transactions.length) continue;

      for (const transaction of transactions) {
        grandTotalDollars += transaction.amount;
        grandTotalTransactions += 1;
        userTotalDollars += transaction.amount;
        userTotalTransactions += 1;

        const companyIdentifier = transaction.companyId?._id?.toString() ?? 'unknown';

        if (!grandCompanyTotals[companyIdentifier]) {
          grandCompanyTotals[companyIdentifier] = {
            company: transaction.companyId,
            totalSpent: 0,
            transactionCount: 0,
          };
        }

        if (!userCompanyTotals[companyIdentifier]) {
          userCompanyTotals[companyIdentifier] = {
            company: transaction.companyId,
            totalSpent: 0,
            transactionCount: 0,
          };
        }

        grandCompanyTotals[companyIdentifier].totalSpent += transaction.amount;
        grandCompanyTotals[companyIdentifier].transactionCount += 1;
        if (companyIdentifier !== 'unknown') grandCompanyTotals[companyIdentifier].company = transaction.companyId;

        userCompanyTotals[companyIdentifier].totalSpent += transaction.amount;
        userCompanyTotals[companyIdentifier].transactionCount += 1;
        if (companyIdentifier !== 'unknown') userCompanyTotals[companyIdentifier].company = transaction.companyId;

        if (!!transaction.companyId?.sectors?.length) {
          // CALCULATE GROUP BY ALL SECTORS
          for (const popSector of transaction.popSectors) {
            if (!grandAllSectorTotals[popSector._id.toString()]) {
              grandAllSectorTotals[popSector._id.toString()] = {
                sector: popSector,
                tier: popSector.tier,
                totalSpent: 0,
                transactionCount: 0,
                companies: [],
              };
            }

            if (!userAllSectorTotals[popSector._id.toString()]) {
              userAllSectorTotals[popSector._id.toString()] = {
                sector: popSector,
                tier: popSector.tier,
                totalSpent: 0,
                transactionCount: 0,
                companies: [],
              };
            }

            grandAllSectorTotals[popSector._id.toString()].totalSpent += transaction.amount;
            grandAllSectorTotals[popSector._id.toString()].transactionCount += 1;
            if (companyIdentifier !== 'unknown') grandAllSectorTotals[popSector._id.toString()].companies.push(transaction.companyId);

            userAllSectorTotals[popSector._id.toString()].totalSpent += transaction.amount;
            userAllSectorTotals[popSector._id.toString()].transactionCount += 1;
            if (companyIdentifier !== 'unknown') userAllSectorTotals[popSector._id.toString()].companies.push(transaction.companyId);
          }

          // CALCULATE GROUPED BY PRIMARY SECTOR ONLY
          const primarySector: ICompanySector = transaction.companyId.sectors.find((companySector: ICompanySector) => companySector.primary);
          const popPrimarySector: ISectorDocument = transaction.popSectors.find((s: ISectorDocument) => s._id.toString() === primarySector.sector.toString());

          if (!grandPrimarySectorTotals[popPrimarySector._id.toString()]) {
            grandPrimarySectorTotals[popPrimarySector._id.toString()] = {
              sector: popPrimarySector,
              tier: popPrimarySector.tier,
              totalSpent: 0,
              transactionCount: 0,
              companies: [],
            };
          }

          if (!userPrimarySectorTotals[popPrimarySector._id.toString()]) {
            userPrimarySectorTotals[popPrimarySector._id.toString()] = {
              sector: popPrimarySector,
              tier: popPrimarySector.tier,
              totalSpent: 0,
              transactionCount: 0,
              companies: [],
            };
          }

          grandPrimarySectorTotals[popPrimarySector._id.toString()].totalSpent += transaction.amount;
          grandPrimarySectorTotals[popPrimarySector._id.toString()].transactionCount += 1;
          if (companyIdentifier !== 'unknown') grandPrimarySectorTotals[popPrimarySector._id.toString()].companies.push(transaction.companyId);

          userPrimarySectorTotals[popPrimarySector._id.toString()].totalSpent += transaction.amount;
          userPrimarySectorTotals[popPrimarySector._id.toString()].transactionCount += 1;
          if (companyIdentifier !== 'unknown') userPrimarySectorTotals[popPrimarySector._id.toString()].companies.push(transaction.companyId);
        }
      }

      const transactionTotal = getTransactionTotal(user, Object.values(userCompanyTotals), Object.values(userAllSectorTotals), Object.values(userPrimarySectorTotals), userTotalDollars, userTotalTransactions, allTransactionTotals);

      await transactionTotal.save();
    } catch (err) {
      console.log(`\n[-] error generating transaction total for user: ${user._id}`);
      console.log(err, '\n');
      errorCount += 1;
      continue;
    }
  }

  try {
    /**
     * transaction totals for all users stored as app user (for id, see: process.env.APP_USER_ID)
     */
    const allUsersTransactionTotal = getTransactionTotal(appUser, Object.values(grandCompanyTotals), Object.values(grandAllSectorTotals), Object.values(grandPrimarySectorTotals), grandTotalDollars, grandTotalTransactions, allTransactionTotals);
    await allUsersTransactionTotal.save();
  } catch (err) {
    console.log('\n[-] error generating transaction total for all users');
    console.log(err, '\n');
    errorCount += 1;
  }

  const completeMessage = !!errorCount
    ? `[!] generating user transaction totals completed with ${errorCount} errors.`
    : `[+] ${users.length} user transaction totals generated successfully`;

  console.log(`\n${completeMessage}\n`);
};
