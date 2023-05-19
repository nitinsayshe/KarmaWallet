import { CompanyModel } from '../../models/company';
import { V2TransactionManualMatchModel } from '../../models/v2_transaction_manualMatch';

export const removeDeletedCompaniesFromManualMatches = async () => {
  const manualMatches = await V2TransactionManualMatchModel.find({ });

  for (const manualMatch of manualMatches) {
    const company = await CompanyModel.findOne({ _id: manualMatch.company });
    if (!company) {
      console.log(`[-] deleting manual match for company ${manualMatch.company}`);
      await V2TransactionManualMatchModel.deleteMany({ company: manualMatch.company });
    }
  }
};
