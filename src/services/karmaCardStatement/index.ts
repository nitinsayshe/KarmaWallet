/* eslint-disable camelcase */
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { ErrorTypes } from '../../lib/constants';
import CustomError from '../../lib/customError';
import { IShareableKarmaCardStatement, KarmaCardStatementModel } from '../../models/karmaCardStatement';
import { TransactionModel } from '../../models/transaction';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';
import { IKarmaCardStatementIdParam } from './types';

export const getKarmaCardStatement = async (req: IRequest<IKarmaCardStatementIdParam, {}, {}>) => {
  const { statementId } = req.params;

  const karmaCardStatement = await KarmaCardStatementModel.findOne({ _id: statementId });
  if (!karmaCardStatement) throw new CustomError(`A karma card statement with id ${statementId} was not found.`, ErrorTypes.NOT_FOUND);

  return karmaCardStatement;
};

export const generateKarmaCardStatementPDF = async (statement: IShareableKarmaCardStatement) => {
  console.log('////// this is the statement data', statement);
  const { startDate, endDate, transactions, userId, _id } = statement;
  const user = await UserModel.findById(userId);
  if (!user) throw new CustomError(`A user with id ${userId} was not found.`, ErrorTypes.NOT_FOUND);
  const { first_name, last_name, address1, address2, postal_code, city, state } = user.integrations.marqeta;
  const fullName = `${first_name} ${last_name}`;
  const cityStatePostal = `${city}, ${state} ${postal_code}`;
  const formattedStartDate = dayjs(startDate).format('MMM DD, YYYY');
  const formattedEndDate = dayjs(endDate).format('MMM DD, YYYY');
  const logoPath = path.resolve(__dirname, 'logos', 'karma_wallet_logo.png');

  const statementTransactions = await TransactionModel.find({
    _id: {
      $in: transactions,
    },
  });

  const doc = new PDFDocument();
  const invoiceName = `karma-card-statement-${_id}.pdf`;
  const invoicePath = path.resolve(__dirname, 'test_pdfs', invoiceName);
  doc.pipe(fs.createWriteStream(invoicePath));

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Account Holder', 20, 20);

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(fullName, 20, 35);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Address', 160, 20);

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(address1, 160, 35);

  if (address2) {
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(address2, 160, 50);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(cityStatePostal, 160, 75);
  } else {
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(cityStatePostal, 160, 50);
  }

  // doc.image(logoPath, {
  //   fit: [1, 300],
  //   align: 'center',
  //   valign: 'center',
  // });
  doc.end();
};

export const generateKarmaCardStatement = async (userId: string, startDate: string, endDate: string) => {
  if (!userId) throw new CustomError('A user id is required.', ErrorTypes.INVALID_ARG);
  if (!startDate) throw new CustomError('A start date is required.', ErrorTypes.INVALID_ARG);
  if (!endDate) throw new CustomError('An end date is required.', ErrorTypes.INVALID_ARG);

  // throw error if already an existing statement for this user and time period
  const existingStatement = await KarmaCardStatementModel.findOne({
    userId,
    startDate,
    endDate,
  });

  console.log('////// this is the existing statement', existingStatement);

  if (!!existingStatement) {
    throw new CustomError(`A karma card statement for user ${userId} already exists for the date range ${startDate} - ${endDate}.`, ErrorTypes.CONFLICT);
  }

  const transactions = await TransactionModel.find({
    user: userId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
    'integrations.marqeta': { $exists: true },
  });

  console.log('///// these are the transactions', transactions);

  const transactionIds = transactions.map(t => t._id);

  const newStatement = await KarmaCardStatementModel.create({
    startDate: dayjs(startDate),
    endDate: dayjs(endDate),
    transactions: transactionIds,
    userId,
  });

  const successfulPdf = await generateKarmaCardStatementPDF(newStatement);

  await newStatement.delete();
};
