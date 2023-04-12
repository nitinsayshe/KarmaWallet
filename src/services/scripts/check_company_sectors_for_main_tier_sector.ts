import fs from 'fs';
import { CompanyModel } from '../../models/company';
import { ISectorDocument, SectorModel } from '../../models/sector';

export const checkCompanySectorsForMainTierSector = async () => {
  const errors = [];
  const startTime = Date.now();
  let count = 0;
  let updates = 0;
  const companies = await CompanyModel.find({})
    .populate([
      {
        path: 'sectors.sector',
        model: SectorModel,
      },
    ]);

  for (const company of companies) {
    count += 1;
    console.log(`\n[#] ${company.companyName} is company ${count} of ${companies.length}`);
    console.log(JSON.stringify(company.sectors, null, 2));
    for (const companySector of company.sectors) {
      const sector = companySector.sector as ISectorDocument;
      if (!sector?.tier) console.log(`[#] company ${company?._id} has sector ${sector?._id} with no tier ${JSON.stringify(sector)}`);
      // Don't update for tier 1 sectors
      if (sector?.tier === 1) continue;
      const tierOneParentSector = await SectorModel.findOne({ _id: { $in: sector?.parentSectors }, tier: 1 });
      if (!tierOneParentSector) {
        errors.push({ company: company._id, sector: sector._id, error: 'No tier 1 parent sector' });
        continue;
      }
      const companyHasParentSector = company.sectors.some(cs => (cs.sector as ISectorDocument)._id.toString() === tierOneParentSector._id.toString());
      console.log(`company ${company._id} has parent sector ${tierOneParentSector._id}: ${companyHasParentSector}`);
      if (companyHasParentSector) continue;
      console.log(`[#] company ${company._id} does not have parent sector ${tierOneParentSector._id}`);
      company.sectors.push({ primary: false, sector: tierOneParentSector });
      await company.save();
      console.log(`[#] company ${company._id} updated`);
      updates += 1;
    }
  }
  const endTime = Date.now();
  const duration = endTime - startTime;
  const durationInMinutes = duration / 1000 / 60;
  if (errors.length) fs.writeFileSync('mainTierSectorErrors.json', JSON.stringify(errors, null, 2));
  console.log(`[#] ${updates} companies updated in ${durationInMinutes} minutes with ${errors.length} errors`);
};
