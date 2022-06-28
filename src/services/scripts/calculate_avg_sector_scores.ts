import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { CompanyModel } from '../../models/company';
import { ISectorDocument, SectorModel } from '../../models/sector';

interface IAvgScores {
  sectorId: string;
  sectorName: string;
  numCompanies: number;
  avgScore: number;
}

export const calculateAvgSectorScores = async () => {
  console.log('retrieving all sectors...');
  let sectors: ISectorDocument[];

  try {
    sectors = await SectorModel.find({});
  } catch (err) {
    console.log('[-] Error retrieving sectors: ', err);
  }

  if (!sectors) return;

  console.log('[+] sectors retrieved...calculating avg scores...');

  const avgScores: IAvgScores[] = [];

  for (const sector of sectors) {
    const companies = await CompanyModel.find({ 'sectors.sector': sector });

    if (!companies?.length) {
      avgScores.push({
        sectorId: sector._id.toString(),
        sectorName: sector.name,
        numCompanies: 0,
        avgScore: 0,
      });

      continue;
    }

    const sum = companies.reduce((acc, curr) => acc + curr.combinedScore, 0);
    const avg = sum / companies.length;

    avgScores.push({
      sectorId: sector._id.toString(),
      sectorName: sector.name,
      numCompanies: companies.length,
      avgScore: avg,
    });
  }

  const _csv = parse(avgScores);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'avg_company_scores_by_sector.csv'), _csv);

  console.log('[+] avg scores calculated');
};
