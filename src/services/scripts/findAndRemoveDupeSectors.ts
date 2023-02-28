import { CompanyModel } from '../../models/company';

function getAllIndexes(arr: any, val: any) {
  const indexes = [];
  let i = -1;
  // eslint-disable-next-line no-cond-assign
  while ((i = arr.indexOf(val, i + 1)) !== -1) {
    indexes.push(i);
  }
  return indexes;
}

export const findCompaniesWithDupeSectorsAndClear = async () => {
  const companies = await CompanyModel.find({});
  let count = 0;

  try {
    for (const company of companies) {
      count += 1;
      if (count < 345) continue;
      console.log(`[+] ${count} of ${companies.length}: ${company.companyName}`);
      const sectorIndexesToDelete = [];
      const sectors = company.sectors.map(s => s?.sector.toString());

      for (const sector of sectors) {
        const dupeSectors = getAllIndexes(sectors, sector);
        if (dupeSectors.length > 1) {
          const firstRemoved = dupeSectors.shift();
          sectorIndexesToDelete.push(firstRemoved);
        }
      }

      if (!!sectorIndexesToDelete.length) {
        console.log(`[+] ${company.companyName} has ${sectorIndexesToDelete.length} dupe sectors to delete`);
        const indexesToDelete = [...new Set(sectorIndexesToDelete)];
        const newSectors = company.sectors.filter((s, index) => !indexesToDelete.includes(index));
        company.sectors = newSectors;
        await company.save();
      }
    }
  } catch (err: any) {
    console.log('[+]Error updating company sectors', err);
  }
};
