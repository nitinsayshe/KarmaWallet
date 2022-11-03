import { CompanyModel } from '../../models/company';
import { MatchedCompanyNameModel } from '../../models/matchedCompanyName';

export const removeDeletedCompaniesFromManualMatches = async () => {
  const manualMatches = await MatchedCompanyNameModel.find({ });

  for (const manualMatch of manualMatches) {
    const company = await CompanyModel.findOne({ _id: manualMatch.companyId });
    if (!company) {
      console.log(`[-] deleting manual match for company ${manualMatch.companyId}`);
      await MatchedCompanyNameModel.deleteMany({ companyId: manualMatch.companyId });
    }
  }
};
