/* eslint-disable camelcase */
import dayjs from 'dayjs';
import path from 'path';
import PDFKit from 'pdfkit-table';
import utc from 'dayjs/plugin/utc';
import { ErrorTypes } from '../../../lib/constants';
import CustomError from '../../../lib/customError';
import { IShareableKarmaCardStatement } from '../../../models/karmaCardStatement';
import { ITransaction, TransactionModel } from '../../../models/transaction';
import { UserModel } from '../../../models/user';
import { TransactionSubtypeEnum, TransactionTypeEnum } from '../../../lib/constants/transaction';
import { getMarqetaMerchantName } from '../../transaction';

dayjs.extend(utc);

export const getTransactionData = (transaction: ITransaction) => {
  const { type, subType } = transaction;

  const transactionData = {
    amountPrefix: '',
    descriptionText: '',
  };

  // Credit Transaction
  if (type === TransactionTypeEnum.Credit) {
    transactionData.amountPrefix = '+';

    if (subType === TransactionSubtypeEnum.Cashback) {
      transactionData.descriptionText = 'Cashback Deposit';
    }

    if (subType === TransactionSubtypeEnum.ProgramCredit) {
      if (transaction.integrations.marqeta.gpa_order.memo) {
        transactionData.descriptionText = transaction.integrations.marqeta.gpa_order.memo;
      } else {
        transactionData.descriptionText = 'Courtesy Credit from Karma Wallet';
      }
    }

    if (subType === TransactionSubtypeEnum.Employer) {
      transactionData.descriptionText = 'Employer Gift';
    }

    if (subType === TransactionSubtypeEnum.Refund) {
      const merchantForRefund = getMarqetaMerchantName(transaction.integrations.marqeta);
      transactionData.descriptionText = `Refund from ${merchantForRefund}`;
    }
  }

  // Debit Transaction
  if (type === TransactionTypeEnum.Debit) {
    const merchantName = getMarqetaMerchantName(transaction.integrations.marqeta);
    transactionData.amountPrefix = '-';
    const marqetaType = transaction.integrations.marqeta.type;

    if (marqetaType.includes('pindebit.atm.withdrawal')) {
      transactionData.descriptionText = 'ATM Withdrawal';
    }

    if (marqetaType.includes('pindebit.cashback')) {
      transactionData.descriptionText = `${merchantName} POS Cashback`;
    }

    if (marqetaType.includes('pindebit.quasi.cash')) {
      transactionData.descriptionText = `${merchantName} POS Quasi Cash`;
    }

    if (marqetaType === 'pindebit') {
      transactionData.descriptionText = `${merchantName} POS Purchase`;
    }

    if (marqetaType.includes('authorization')) {
      transactionData.descriptionText = merchantName;
    }
  }

  // Adjustment Transaction
  if (type === TransactionTypeEnum.Adjustment) {
    transactionData.amountPrefix = '+';
    transactionData.descriptionText = 'Adjustment';
  }

  // Deposit Transaction
  if (type === TransactionTypeEnum.Deposit) {
    if (!!transaction?.achTransfer) {
      // update this to show the bank name
      // transaction.achTransfer.bank.name
      const bank = transaction.achTransfer?.bank?.institution.toUpperCase() || 'External Bank';
      transactionData.descriptionText = `ACH Transfer from ${bank}`;
    } else if (transaction?.integrations?.marqeta?.direct_deposit) {
      const bank = transaction.integrations?.marqeta?.direct_deposit?.company_name.toUpperCase() || 'External Bank';
      transactionData.descriptionText = `ACH Transfer from ${bank}`;
    } else {
      transactionData.descriptionText = 'ACH Deposit from External Bank';
    }

    transactionData.amountPrefix = '+';
  }

  // Withdrawal Transaction
  if (type === TransactionTypeEnum.Withdrawal) {
    transactionData.amountPrefix = '-';
    const bank = transaction.integrations?.marqeta?.direct_deposit?.company_name.toUpperCase() || 'External Bank';
    transactionData.descriptionText = `ACH Withdrawal from ${bank}`;
  }

  return transactionData;
};

export const getTypeText = (transaction: ITransaction) => {
  if (transaction.type === TransactionTypeEnum.Credit) {
    if (transaction.subType === TransactionSubtypeEnum.Cashback || transaction.subType === TransactionSubtypeEnum.Employer || transaction.subType === TransactionSubtypeEnum.ProgramCredit) {
      return 'Credit';
    }

    if (transaction.subType === TransactionSubtypeEnum.Refund) {
      return 'Refund';
    }
  }

  if (transaction.type === TransactionTypeEnum.Debit) {
    return 'Debit';
  }

  if (transaction.type === TransactionTypeEnum.Adjustment) {
    return 'Adjustment';
  }

  if (transaction.type === TransactionTypeEnum.Deposit) {
    return 'Deposit';
  }

  if (transaction.type === TransactionTypeEnum.Withdrawal) {
    return 'Withdrawal';
  }
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
      const hasRelatedTransactions = !!t.integrations?.marqeta?.relatedTransactions && !!t.integrations?.marqeta?.relatedTransactions.length;
      const { settledDate, integrations, amount, date } = t;
      const balance = hasRelatedTransactions ? t.integrations.marqeta.relatedTransactions[0].gpa.ledger_balance : integrations.marqeta.gpa.ledger_balance;
      const transactionData = getTransactionData(t);

      return [
        !!settledDate ? dayjs(settledDate).utc().format('MM/DD') : dayjs(date).utc().format('MM/DD'),
        getTypeText(t),
        `${transactionData.amountPrefix}$${amount.toFixed(2)}`,
        `$${balance.toFixed(2)}`,
        transactionData.descriptionText,
      ];
    }),
  };

  return transactionsTable;
};

export const buildTotalsTable = (statement: IShareableKarmaCardStatement) => {
  const { startBalance, endBalance, debits, deposits, adjustments, cashback, credits, withdrawals } = statement.transactionTotals;
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
        'Opening Balance',
        startBalance === 0 ? '$0.00' : `$${startBalance.toFixed(2)}`,
        'Statement Period',
        `${dayjs(startDate).utc().format('MM/DD/YYYY')} - ${dayjs(endDate).utc().format('MM/DD/YYYY')} `,
      ],
      [
        'Total Credits',
        credits === 0 ? '$0.00' : `$${credits.toFixed(2)}`,
        'Total Debits',
        debits === 0 ? '$0.00' : `$${debits.toFixed(2)}`,
      ],
      [
        'Deposits',
        deposits === 0 ? '$0.00' : `$${deposits.toFixed(2)}`,
        'Withdrawals',
        withdrawals === 0 ? '$0.00' : `$${withdrawals.toFixed(2)}`,
      ],
      [
        'Cashback',
        `$${cashback.toFixed(2)}`,
        'Ending Balance',
        endBalance === 0 ? '$0.00' : `$${endBalance.toFixed(2)}`,
      ],
      [
        'Adjustments/Disputes',
        `$${adjustments.toFixed(2)}`,
        'Fees this Period',
        '$0.00',
      ],
      [
        'Fees YTD',
        '$0.00',
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
  })
    .populate({ path: 'achTransfer', options: { strictPopulate: false } });

  const sortedOldestTransactionsFirst = statementTransactions.sort((a, b) => (dayjs(a.sortableDate).isBefore(dayjs(b.sortableDate)) ? -1 : 1));

  let pageNumber = 0;
  const doc = new PDFKit({ autoFirstPage: false, margins: { top: 53, bottom: 53, left: 53, right: 53 } });
  // Uncommented the below if you want to save a PDF to the local test_pdfs folder
  // const invoiceName = `karma-card-statement-${_id}.pdf`;
  // const invoicePath = path.resolve(__dirname, 'test_pdfs', invoiceName);
  // doc.pipe(fs.createWriteStream(invoicePath));
  const logoPath = path.resolve(__dirname, '', 'karma_wallet_logo.png');
  const spaceFromSide = 53;
  doc.on('pageAdded', () => {
    pageNumber += 1;
    const { bottom } = doc.page.margins;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8);
    doc.text(
      `Page ${pageNumber}`,
      0.5 * (doc.page.width - 100),
      doc.page.height - 50,
      {
        width: 100,
        align: 'center',
        lineBreak: false,
      },
    );

    // Reset text writer position
    doc.text('', 50, 50);
    doc.page.margins.bottom = bottom;
  });
  doc.addPage();
  doc.image(logoPath, { width: 100 }).moveDown();
  const { width } = doc.page;
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

  const transactionsTable = buildTransactionsTable(sortedOldestTransactionsFirst);

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
  // page with dispute text
  doc.addPage();
  doc.image(logoPath, { width: 100 }).moveDown();
  doc.moveDown();
  doc.moveDown();
  doc.moveDown();
  doc
    .text('Karma Wallet')
    .text('11845 Retail Drive, #1107')
    .text('Wake Forest, NC 27587');
  doc.moveDown();
  doc.moveDown();
  doc
    .font('Helvetica-Bold')
    .text('What to Do if You Think You Found a Mistake on Your Statement')
    .moveDown()
    .font('Helvetica')
    .text('In case of errors or questions about your electronic transfers, please email support@karmawallet.io or call 1-866-304-4030 as soon as you can, if you think your statement or receipt is wrong or if you need more information about a transfer on the statement or receipt. We must hear from you no later than 60 days after we sent you the FIRST statement on which the error or problem appeared.')
    .moveDown()
    .text('(1) Tell us your name, Karma Wallet account number, and/or 16 digit card number.')
    .text('(2) Describe the error or the transfer you are unsure about, and explain as clearly as you can why you believe it is an error or why you need more information.')
    .text('(3) Tell us the dollar amount of the suspected error.')
    .moveDown()
    .text('We will investigate your complaint and will correct any error promptly. If we take more than 10 business days to do this, we will credit your account for the amount you think is in error, so that you will have the use of the money during the time it takes us to complete our investigation.');
  doc.moveDown();
  doc.moveDown();
  doc
    .text('General Purpose Accounts provided by:')
    .moveDown()
    .text('Pathward N.A.')
    .text('5501 South Broadband Lane')
    .text('Sioux Falls, SD 57108');
  doc.moveDown();
  doc.moveDown();
  doc.text('The Karma Wallet Visa® Prepaid Card is issued by Pathward®, N.A., Member FDIC, pursuant to a license from Visa U.S.A. Inc. The Karma Wallet Visa Prepaid Card is powered by Marqeta. This card can be used everywhere Visa debit cards are accepted.');
  doc.end();
  return doc;
};
