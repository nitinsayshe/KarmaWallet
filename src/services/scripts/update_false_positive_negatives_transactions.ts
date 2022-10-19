import csv from 'csvtojson';
import path from 'path';
import { CompanyModel } from '../../models/company';
import { TransactionModel } from '../../models/transaction';

export const manuallyUpdateTransactionsFalsePositiveNegatives = async () => {
  const pathString = path.resolve(__dirname, '.tmp', './false_positive_negative_092722.csv');
  const dataJson = await csv().fromFile(pathString);

  for (const data of dataJson) {
    const { _id, companyId } = data;

    try {
      if (companyId) {
        const transaction = await TransactionModel.findOne({ _id });
        if (!transaction) throw new Error(`Transaction ${_id} not found in DB`);
        const company = await CompanyModel.findOne({ _id: companyId });
        if (!company) throw new Error(`Company ${companyId} not found in DB`);
        transaction.company = companyId;
        console.log('[info] Adding Company to Transaction:', transaction._id);
        await transaction.save();
      } else {
        try {
          await TransactionModel.updateOne({ _id }, { $unset: { company: '' } });
          console.log('[info] Removing Company from Transaction:', _id);
        } catch (err) {
          console.log('[info] Error removing company from transaction:', _id);
        }
      }
    } catch (err: any) {
      console.log('[info] Error updating transaction', err);
    }
  }
};
