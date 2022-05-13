/* eslint-disable quote-props */
import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { CardModel, ICardDocument } from '../../models/card';
import { CompanyModel, ICompanyDocument } from '../../models/company';
import { ISectorDocument, SectorModel } from '../../models/sector';
import { ITransactionDocument, TransactionModel } from '../../models/transaction';

interface IStruct {
  [key: string]: string | number | boolean;
}

export const generateUserTransactionReport = async () => {
  console.log('generating users transactions report...');

  let transactions: ITransactionDocument[];

  try {
    transactions = await TransactionModel
      .find({})
      .populate([
        {
          path: 'card',
          model: CardModel,
        },
        {
          path: 'company',
          model: CompanyModel,
          populate: {
            path: 'sectors',
            model: SectorModel,
          },
        },
        {
          path: 'sector',
          model: SectorModel,
        },
      ]);
  } catch (err) {
    console.log('[-] error retrieving transactions');
    console.log(err);
  }

  if (!transactions?.length) return;

  const parsedTransactions = transactions.map(t => {
    const sectors: IStruct = {};

    ((t.companyId as ICompanyDocument)?.sectors || []).forEach((s, i) => {
      sectors[`company.sector.${i}._id`] = (s.sector as ISectorDocument)._id;
      sectors[`company.sector.${i}.name`] = (s.sector as ISectorDocument).name;
      sectors[`company.sector.${i}.tier`] = (s.sector as ISectorDocument).tier;
      sectors[`company.sector.${i}.carbonMultiplier`] = (s.sector as ISectorDocument).carbonMultiplier;
      sectors[`company.sector.${i}.primary`] = s.primary;
    });

    // const categories: IStruct = {};

    // (t.integrations?.plaid?.category || []).forEach((c, i) => {
    //   categories[`integrations.plaid.category.${i + 1}`] = c;
    // });

    return {
      _id: t._id,
      amount: t.amount,
      date: t.date,
      // 'integrations.plaid.account_id': t.integrations?.plaid?.account_id,
      // 'integrations.plaid.account_owner': t.integrations?.plaid?.account_owner,
      // 'integrations.plaid.authorized_date': t.integrations?.plaid?.authorized_date,
      // 'integrations.plaid.authorized_datetime': t.integrations?.plaid?.authorized_datetime,
      // ...categories,
      // 'integrations.plaid.category_id': t.integrations?.plaid?.category_id,
      // 'integrations.plaid.check_number': t.integrations?.plaid?.check_number,
      // 'integrations.plaid.iso_currency_code': t.integrations?.plaid?.iso_currency_code,
      // 'integrations.plaid.location': t.integrations?.plaid?.location,
      // 'integrations.plaid.merchant_name': t.integrations?.plaid?.merchant_name,
      // 'integrations.plaid.name': t.integrations?.plaid?.name,
      // 'integrations.plaid.payment_channel': t.integrations?.plaid?.payment_channel,
      // 'integrations.plaid.pending': t.integrations?.plaid?.pending,
      // 'integrations.plaid.pending_transaction_id': t.integrations?.plaid?.pending_transaction_id,
      // 'integrations.plaid.transaction_code': t.integrations?.plaid?.transaction_code,
      // 'integrations.plaid.transaction_id': t.integrations?.plaid?.transaction_id,
      // 'integrations.plaid.transaction_type': t.integrations?.plaid?.transaction_type,
      // 'integrations.plaid.unofficial_currency_code': t.integrations?.plaid?.unofficial_currency_code,
      // 'integrations.rare.transaction_id': t.integrations?.rare?.transaction_id,
      // 'integrations.rare.currency': t.integrations?.rare?.currency,
      // 'integrations.rare.statement_descriptor': t.integrations?.rare?.statement_descriptor,
      // 'integrations.rare.processed': t.integrations?.rare?.processed,
      // 'integrations.rare.processed_ts': t.integrations?.rare?.processed_ts,
      // 'integrations.rare.projectName': t.integrations?.rare?.projectName,
      // 'integrations.rare.fee_amt': t.integrations?.rare?.fee_amt,
      // 'integrations.rare.subtotal_amt': t.integrations?.rare?.subtotal_amt,
      // 'integrations.rare.tonnes_amt': t.integrations?.rare?.tonnes_amt,
      'association.group': t.association?.group,
      'association.user': t.association?.user,
      'createdOn': t?.createdOn,
      'card._id': (t.cardId as ICardDocument)?._id,
      'card.userId': (t.cardId as ICardDocument)?.userId,
      'card.name': (t.cardId as ICardDocument)?.name,
      'card.mask': (t.cardId as ICardDocument)?.mask,
      'card.type': (t.cardId as ICardDocument)?.type,
      'card.status': (t.cardId as ICardDocument)?.status,
      // 'card.integrations.rare.userId': (t.cardId as ICardDocument)?.integrations?.rare?.userId,
      // 'card.integrations.rare.card_id': (t.cardId as ICardDocument)?.integrations?.rare?.card_id,
      // 'card.integrations.rare.card_type': (t.cardId as ICardDocument)?.integrations?.rare?.card_type,
      // 'card.integrations.rare.last_four': (t.cardId as ICardDocument)?.integrations?.rare?.last_four,
      // 'card.integrations.rare.expr_month': (t.cardId as ICardDocument)?.integrations?.rare?.expr_month,
      // 'card.integrations.rare.expr_year': (t.cardId as ICardDocument)?.integrations?.rare?.expr_year,
      'card.createdOn': (t.cardId as ICardDocument)?.createdOn,
      'card.lastModified': (t.cardId as ICardDocument)?.lastModified,
      'company._id': (t.companyId as ICompanyDocument)?._id,
      'company.companyName': (t.companyId as ICompanyDocument)?.companyName,
      'user': t.userId,
      'sector._id': (t.sector as ISectorDocument)?._id,
      'sector.name': (t.sector as ISectorDocument)?.name,
      'sector.tier': (t.sector as ISectorDocument)?.tier,
      'sector.carbonMultiplier': (t.sector as ISectorDocument)?.carbonMultiplier,
      ...sectors,
    };
  });

  const _csv = parse(parsedTransactions);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'user_transactions_report.csv'), _csv);
};
