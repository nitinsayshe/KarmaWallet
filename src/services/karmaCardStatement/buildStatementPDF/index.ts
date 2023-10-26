/* eslint-disable camelcase */
import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';
import PDFKit from 'pdfkit-table';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../../lib/constants';
import CustomError from '../../../lib/customError';
import { IShareableKarmaCardStatement } from '../../../models/karmaCardStatement';
import { ITransaction, TransactionModel } from '../../../models/transaction';
import { UserModel } from '../../../models/user';

dayjs.extend(utc);

const formatNumberWithCommas = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const getDescription = (transaction: ITransaction) => {
  // const { type } = transaction;
  // will either get the bank info, subtype or merchant here
  console.log('//// update with new transaction code', transaction);
  return 'Bank of America';
};

export const buildTransactionsTable = (transactions: ITransaction[]) => {
  const transactionsTable: any = {
    headers: [
      { label: 'Date', property: 'date', width: 50, headerColor: 'white', font: 'Helvetiva-Bold' },
      { label: 'Type', property: 'type', width: 70, headerColor: 'white', font: 'Helvetiva-Bold' },
      { label: 'Amount', property: 'amount', width: 70, headerColor: 'white', font: 'Helvetiva-Bold' },
      { label: 'Balance', property: 'balance', width: 70, headerColor: 'white', font: 'Helvetiva-Bold' },
      { label: 'Description', property: 'description', width: 200, headerColor: 'white', font: 'Helvetiva-Bold' },
    ],
    rows: transactions.map(t => {
      const { date, integrations, type, amount } = t;
      const balance = integrations.marqeta.gpa.available_balance;

      return [
        dayjs(date).format('MM/DD'),
        type || 'Debit',
        `$${formatNumberWithCommas(parseInt(amount.toFixed(2)))}`,
        `$${formatNumberWithCommas(parseInt(balance.toFixed(2)))}`,
        getDescription(t),
      ];
    }),
  };

  return transactionsTable;
};

export const buildTotalsTable = (statement: IShareableKarmaCardStatement) => {
  const { startBalance, endBalance, debits, deposits, adjustments, cashback, credits } = statement.transactionTotals;
  const { startDate, endDate } = statement;

  const totalsTable: any = {
    headers: [
      { label: '', property: 'transactionText1', width: 90, height: 0, headerColor: 'white' },
      { label: '', property: 'amount1', width: 100, height: 0, headerColor: 'white' },
      { label: '', property: 'transactionText2', width: 110, height: 0, headerColor: 'white' },
      { label: '', property: 'amount2', width: 120, height: 0, headerColor: 'white' },
    ],
    rows: [
      [
        'Open balance',
        `$${formatNumberWithCommas(parseInt(startBalance.toFixed(2)))}`,
        'Statement date',
        dayjs(startDate).format('MM/DD/YYYY'),
      ],
      [
        'Deposits (ACH)',
        `$${formatNumberWithCommas(parseInt(deposits.toFixed(2)))}`,
        'Statement Period',
        `${dayjs(startDate).utc().format('MM/DD/YYYY')} - ${dayjs(endDate).utc().format('MM/DD/YYYY')} `,
      ],
      [
        'Total Credits',
        `$${formatNumberWithCommas(parseInt(credits.toFixed(2)))}`,
        'Cashback',
        `$${formatNumberWithCommas(parseInt(cashback.toFixed(2)))}`,
      ],
      [
        'Total Debits',
        `$${formatNumberWithCommas(parseInt(debits.toFixed(2)))}`,
        'Adjustments/Disputes',
        `$${formatNumberWithCommas(parseInt(adjustments.toFixed(2)))}`,
      ],
      [
        'Ending Balance',
        `$${formatNumberWithCommas(parseInt(endBalance.toFixed(2)))}`,
        '',
        '',
      ],
    ],
  };
  return totalsTable;
};

export const generateKarmaCardStatementPDF = async (statement: IShareableKarmaCardStatement) => {
  const { userId, _id, transactions } = statement;
  const user = await UserModel.findById(userId);
  // if no transactions will need to do slightly different logic
  if (!user) throw new CustomError(`A user with id ${userId} was not found.`, ErrorTypes.CONFLICT);
  const { first_name, last_name, address1, address2, postal_code, city, state } = user.integrations.marqeta;
  const fullName = `${first_name} ${last_name}`;
  const cityStatePostal = `${city}, ${state} ${postal_code}`;

  const statementTransactions = await TransactionModel.find({
    _id: {
      $in: transactions,
    },
  });

  const doc = new PDFKit();
  const invoiceName = `karma-card-statement-${_id}.pdf`;
  const invoicePath = path.resolve(__dirname, 'test_pdfs', invoiceName);
  const logoPath = path.resolve(__dirname, '', 'karma_wallet_logo.png');
  doc.pipe(fs.createWriteStream(invoicePath));
  doc.image(logoPath, { width: 100 }).moveDown();
  const { width } = doc.page;
  const spaceFromSide = 72;

  doc.moveDown();
  doc.moveDown();
  doc
    .fontSize(8)
    .font('Helvetica-Bold')
    .text('Karma Wallet', { continued: true })
    .text('Account Holder', { align: 'right' })
    .moveDown()
    .font('Helvetica')
    .text('11845 Retail Drive, #1107', { continued: true, align: 'left' })
    .text(fullName, { align: 'right' })
    .text('Wake Forest, NC 27587', { continued: true, align: 'left' })
    .text(address1, { align: 'right' })
    .text('karmawallet.io', { continued: true, align: 'left' });
  if (address2) {
    doc.text(address2, { align: 'right' });
    doc.text(cityStatePostal, { align: 'right' });
  } else {
    doc.text(cityStatePostal, { align: 'right' });
  }
  doc.moveDown();
  doc.moveDown();
  doc.moveDown();
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Karma Wallet Card Account Statement', { align: 'left' });
  doc.moveDown();
  doc.moveDown();
  doc
    .font('Helvetica')
    .fontSize(8)
    .text('Statement Summary', { align: 'left' });
  doc.moveDown();
  doc.moveTo(spaceFromSide, doc.y)
    .lineTo(width - spaceFromSide, doc.y)
    .stroke();
  doc.moveDown();
  const totalsTable = buildTotalsTable(statement);
  // add table to the pdf
  await doc.table(totalsTable, {
    x: spaceFromSide + 30,
    divider: {
      header: { disabled: true },
      horizontal: { disabled: true },
    },
    prepareRow: (row?: any, indexColumn?: number) => {
      doc.font('Helvetica').fontSize(8);

      if (indexColumn === 0 || indexColumn === 2) {
        doc.font('Helvetica-Bold');
      }
      return row;
    },
  });

  doc.moveTo(spaceFromSide, doc.y)
    .lineTo(width - spaceFromSide, doc.y)
    .stroke();
  doc.moveDown();
  doc.moveTo(spaceFromSide + 30, doc.y);
  doc.moveDown();
  doc.moveDown();
  doc
    .font('Helvetica')
    .text('Transactions', { align: 'left' });

  doc.moveDown();
  doc.moveDown();

  const transactionsTable = buildTransactionsTable(statementTransactions);

  await doc.table(transactionsTable, {
    x: spaceFromSide + 30,
    divider: {
      header: { disabled: true },
      horizontal: { disabled: true },
    },
    prepareRow: (row?: any) => {
      doc.font('Helvetica').fontSize(8);
      return row;
    },
  });
  doc.end();
};
