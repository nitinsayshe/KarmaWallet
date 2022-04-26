import { TransactionModel } from '../../models/transaction';

export const analyzeTransactions = async () => {
  console.log('\nanalyzing transactions...');

  try {
    const transactions = await TransactionModel.find({}).lean();

    let missingSectors = 0;
    let missingCompany = 0;

    for (const transaction of transactions) {
      if (!transaction.sector) missingSectors += 1;
      if (!transaction.company) missingCompany += 1;
    }

    console.log('\nTRANSACTION ANALYSIS:');
    console.log(`total transactions...........${transactions.length.toLocaleString('en-US')}`);
    console.log(`missing carbon multipliers...${missingSectors.toLocaleString('en-US')}`);
    console.log(`missing company info.........${missingCompany.toLocaleString('en-US')}`);
    console.log('');
  } catch (err) {
    console.log(err);
  }
};
