import { CardModel } from '../../models/card';
import { TransactionModel } from '../../models/transaction';

const getDateTimeDifferenceInMinutes = (date1: Date, date2: Date) => {
  const diff = date2.getTime() - date1.getTime();
  const diffInMinutes = Math.ceil(diff / (1000 * 60));
  return diffInMinutes;
};

const getLocaleDateAndTime = (date: Date) => {
  const localeDate = new Date(date);
  const localeDateAndTime = localeDate.toLocaleString();
  return localeDateAndTime;
};

export const logTransactionProcessingLag = async () => {
  const cards = await CardModel.find({}).sort({ createdOn: -1 });
  for (const card of cards) {
    const firstTransaction = await TransactionModel.findOne({ card: card._id }).sort({ createdOn: 1 });
    if (!firstTransaction) continue;
    const timeDiff = getDateTimeDifferenceInMinutes(new Date(card.createdOn), new Date(firstTransaction.createdOn));
    console.log(`\n[#] card ${card._id} was created on ${getLocaleDateAndTime(card.createdOn)} and first transaction was created on ${getLocaleDateAndTime(firstTransaction.createdOn)} which is ${timeDiff} minutes.`);
    console.log(`[#] transaction lag time was ${timeDiff} minutes.`);
  }
};
