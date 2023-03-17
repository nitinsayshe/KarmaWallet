import { Parser } from 'json2csv';
import fs from 'fs';
import { CardStatus } from '../../lib/constants';
import { CardModel } from '../../models/card';
import { TransactionModel } from '../../models/transaction';
import { roundToPercision } from '../../lib/misc';
import { UserModel } from '../../models/user';

interface IFinancialInstitutionReport {
  name: string;
  cards: number;
  depositoryAccounts: number;
  creditAccounts: number;
  transactions: number;
  transactionsAmount: number;
  debitTransactions: number;
  debitTransactionsAmount: number;
  creditTransactions: number;
  creditTransactionsAmount: number;
}

interface IFinancialInstitutionUserReportRow {
  financialInstitutions: string[];
  userId: string;
  numLinkedCards: number;
  numUnlinkedCards: number;
}

export const generateFIUserReport = async (institutions: string[]) => {
  if (!institutions || institutions.length === 0) {
    return;
  }

  try {
    console.log('generating finanacial institution user report...');
    const report: IFinancialInstitutionUserReportRow[] = [];

    const cards = await CardModel.aggregate()
      .match({ institution: { $in: institutions } })
      .group({ _id: '$userId' });

    const userIds = cards.map((id: { _id: string }) => id._id);

    await Promise.all(
      userIds.map(async (id) => {
        const user = await UserModel.findById(id);
        if (!user) return;
        console.log(user);
        const linkedCards = await CardModel.find({
          userId: user._id,
          status: CardStatus.Linked,
          institution: { $in: institutions },
        }).sort({ createdOn: 1 });
        const notLinkedCards = await CardModel.find({
          userId: user._id,
          status: { $ne: CardStatus.Linked },
          institution: { $in: institutions },
        });
        const financialInstitutions = new Set<string>();
        linkedCards?.forEach((card) => {
          financialInstitutions.add(card.institution);
        });
        notLinkedCards?.forEach((card) => {
          financialInstitutions.add(card.institution);
        });

        const userReport: IFinancialInstitutionUserReportRow = {
          userId: user._id.toString(),
          financialInstitutions: Array.from(financialInstitutions),
          numLinkedCards: linkedCards?.length || 0,
          numUnlinkedCards: notLinkedCards?.length || 0,
        };
        report.push(userReport);
      }),
    );

    const fileName = `FI_User_Report_${institutions.join('_').toUpperCase()}${new Date().toISOString()}.csv`;
    console.log('Writing data to ', fileName);

    const parser = new Parser({
      fields: [
        'userId',
        'financialInstitutions',
        'numLinkedCards',
        'numUnlinkedCards',
      ],
    });
    const csv = parser.parse(report);

    fs.writeFileSync(fileName, csv);

    console.log('report generated successfully!');
  } catch (err) {
    console.log(err);
  }
};

export const generateFIReport = async (
  linkedAccountsReport: boolean,
): Promise<IFinancialInstitutionReport[]> => {
  try {
    console.log('generating financial institution report...');
    // get a list of transactions grouped by financial institution - breakdown by debit/credit and include total
    const report: IFinancialInstitutionReport[] = [];

    const institutionMatchQuery: any = {
      $and: [
        { institution: { $exists: true } },
        { institution: { $ne: null } },
        { institution: { $ne: '' } },
        {
          status: linkedAccountsReport
            ? CardStatus.Linked
            : { $in: [CardStatus.Unlinked, CardStatus.Removed] },
        },
      ],
    };

    // get a list of all financial institutions
    const financialInstitutions = await CardModel.aggregate()
      .match(institutionMatchQuery)
      .group({
        _id: '$institution',
      });

    // financialInstitutions[n]._id = financial institution name
    // for each institution, get the total number of cards, total number of transactions, total amount of transactions, total number of debit transactions, total amount of debit transactions, total number of credit transactions, total amount of credit transactions
    await Promise.all(
      financialInstitutions.map(async (institution) => {
        console.log(
          'retrieving card and transaction data for ',
          institution._id,
        );

        const reportItem: IFinancialInstitutionReport = {
          name: institution._id,
          cards: 0,
          depositoryAccounts: 0,
          creditAccounts: 0,
          transactions: 0,
          transactionsAmount: 0,
          debitTransactions: 0,
          debitTransactionsAmount: 0,
          creditTransactions: 0,
          creditTransactionsAmount: 0,
        };

        const cardQuery: any = {
          institution: institution._id,
          status: linkedAccountsReport
            ? CardStatus.Linked
            : { $in: [CardStatus.Unlinked, CardStatus.Removed] },
        };
        const cards = await CardModel.find(cardQuery);
        if (!cards || cards.length === 0) {
          report.push(reportItem);
          return report;
        }
        reportItem.cards = cards.length;

        // transactions associated with the institution
        const cardIds = cards.map((card) => card._id);
        const transactions = await TransactionModel.find({
          card: { $in: cardIds },
        });
        if (!!transactions && transactions.length > 0) {
          reportItem.transactions = transactions.length;
          reportItem.transactionsAmount = roundToPercision(
            transactions.reduce(
              (acc, transaction) => acc + Math.abs(transaction.amount),
              0,
            ),
            2,
          );
        }

        // debit cards and transactions
        const depositoryAccountsQuery: any = { ...cardQuery };
        depositoryAccountsQuery.type = 'depository';
        const depositoryAccounts = await CardModel.find(
          depositoryAccountsQuery,
        );
        reportItem.depositoryAccounts = depositoryAccounts?.length || 0;

        const debitCardIds = depositoryAccounts.map((card) => card._id);
        const debitTransactions = await TransactionModel.find({
          card: { $in: debitCardIds },
        });
        if (!!debitTransactions && debitTransactions.length > 0) {
          reportItem.debitTransactions = debitTransactions.length;
          reportItem.debitTransactionsAmount = roundToPercision(
            debitTransactions.reduce(
              (acc, transaction) => acc + Math.abs(transaction.amount),
              0,
            ),
            2,
          );
        }

        // credit accounts
        const creditAccountsQuery: any = { ...cardQuery };
        creditAccountsQuery.type = { $ne: 'depository' };
        const creditAccounts = await CardModel.find(creditAccountsQuery);
        reportItem.creditAccounts = creditAccounts?.length || 0;

        const creditCardIds = creditAccounts.map((card) => card._id);
        const creditTransactions = await TransactionModel.find({
          card: { $in: creditCardIds },
        });
        if (!!creditTransactions && creditTransactions.length > 0) {
          reportItem.creditTransactions = creditTransactions.length;
          reportItem.creditTransactionsAmount = roundToPercision(
            creditTransactions.reduce(
              (acc, transaction) => acc + Math.abs(transaction.amount),
              0,
            ),
            2,
          );
        }
        console.log('done retrieving data for ', institution._id);
        report.push(reportItem);
      }),
    );

    const fileName = `FI_Report_${linkedAccountsReport ? '' : 'Unlinked_And_Removed_'
    }${new Date().toISOString()}.csv`;
    console.log('Writing data to ', fileName);

    const parser = new Parser({
      fields: [
        'name',
        'cards',
        'depositoryAccounts',
        'creditAccounts',
        'transactions',
        'transactionsAmount',
        'debitTransactions',
        'debitTransactionsAmount',
        'creditTransactions',
        'creditTransactionsAmount',
      ],
    });
    const csv = parser.parse(report);

    fs.writeFileSync(fileName, csv);

    console.log('report generated successfully!');
    return report;
  } catch (err) {
    console.error(err);
  }
};
