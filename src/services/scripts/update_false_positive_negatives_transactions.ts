import csv from 'csvtojson';
import path from 'path';
import { TransactionModel } from '../../models/transaction';

export const manuallyUpdateTransactionsFalsePositiveNegatives = async () => {
  const pathString = path.resolve(__dirname, '.tmp', './false_positive_negative_092722.csv');
  const dataJson = await csv().fromFile(pathString);

  for (const data of dataJson) {
    const { _id, companyId } = data;
    const transaction = await TransactionModel.findOne({ _id });
    if (!transaction) throw new Error(`Transaction ${_id} not found in DB`);

    try {
      if (companyId) {
        transaction.company = companyId;
        console.log('Adding Company to Transaction:', transaction._id);
      } else {
        transaction.company = null;
        console.log('Removing Company from Transaction:', transaction._id);
      }
      await transaction.save();
    } catch (err: any) {
      console.log('Error updating transaction', err);
    }
  }
};
