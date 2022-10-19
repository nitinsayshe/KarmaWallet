import fs from 'fs';
import path from 'path';
import { CompanyModel, IShareableCompany } from '../../models/company';
import { UnsdgCategoryModel } from '../../models/unsdgCategory';
import { UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';
import { IShareableMerchant, MerchantModel } from '../../models/merchant';
import { ISectorAverageScores, ISectorDocument, SectorModel } from '../../models/sector';
import { getCompanyValues } from '../values';
import { mockRequest } from '../../lib/constants/request';
import { IValueDocument } from '../../models/value';

const getScoreOutOf100 = (score: number, outOf: number) => {
  score = score || 0;
  const _score = score + outOf;
  const float = parseFloat((_score / (outOf * 2)).toFixed(2));
  const final = Math.round(float * 100);
  return final;
};

export interface IMicrosoftWildfireCompany {
  companyName: string;
  karmaWalletUrl: string;
  companyUrl: string;
  subcategoryScores: any;
  categoryScores: any;
  wildfireId: number;
  score: number;
  rating: string;
  values: string[]
  sector: {
    name: string;
    scores: Partial<ISectorAverageScores>;
  }
}

export const generateMicrosoftWildfireCompanies = async () => {
  const companies: IMicrosoftWildfireCompany[] = [];
  const _companies = await CompanyModel.find({ rating: { $in: ['positive', 'neutral'] }, url: { $ne: null }, 'hidden.status': { $ne: true } })
    .populate([
      {
        path: 'merchant',
        model: MerchantModel,
      },
      {
        path: 'sectors.sector',
        model: SectorModel,
      },
      {
        path: 'subcategoryScores',
        populate: {
          path: 'subcategory',
          select: 'name',
          model: UnsdgSubcategoryModel,
        },
      },
      {
        path: 'categoryScores',
        populate: {
          path: 'category',
          select: 'name',
          model: UnsdgCategoryModel,
        },
      },
    ]);

  console.log(`[+] ${_companies.length} companies found`);

  for (const company of _companies) {
    console.log(`[+] processing company: ${company.companyName}`);

    const _company = company as any as IShareableCompany;
    const _merchant = _company.merchant as IShareableMerchant;
    const _primarySector = company.sectors.find(s => s.primary)?.sector as any as ISectorDocument;
    const _mockRequest = { ...mockRequest, query: { companyId: _company._id.toString() } };
    const values = await getCompanyValues(_mockRequest);
    if (!_primarySector) continue;
    const __company = {
      companyName: company.companyName,
      values: values.map(v => (v as IValueDocument).name),
      rating: company.rating,
      score: getScoreOutOf100(company.combinedScore, 16),
      karmaWalletUrl: `https://karmawallet.io/company/${company._id}/${company.slug}`,
      companyUrl: company.url,
      subcategoryScores: company.subcategoryScores.map(subcategory => ({
        subcategory: (subcategory.subcategory as any).name as string,
        score: getScoreOutOf100(subcategory.score, 4),
      })),
      categoryScores: company.categoryScores.map(category => ({
        category: (category.category as any).name as string,
        score: getScoreOutOf100(category.score, 8),
      })),
      wildfireId: _merchant ? _merchant.integrations.wildfire.merchantId : null,
    };

    const _sector = {
      name: _primarySector.name,
      scores: {},
    };
    for (const key of Object.keys(_primarySector.averageScores)) {
      if (key === 'numCompanies') continue;

      if (key === 'avgScore') {
        // @ts-ignore
        _sector.scores[key] = getScoreOutOf100(_primarySector.averageScores[key], 16);
      } else if (key === 'avgPlanetScore' || key === 'avgPeopleScore') {
        // @ts-ignore
        _sector.scores[key] = getScoreOutOf100(_primarySector.averageScores[key], 8);
      } else {
        // @ts-ignore
        _sector.scores[key] = getScoreOutOf100(_primarySector.averageScores[key], 4);
      }
    }
    const finalCompany = { ...__company, sector: _sector };
    companies.push(finalCompany);
  }
  fs.writeFileSync(path.resolve(__dirname, '.tmp', 'microsoft_wildfire_companies.json'), JSON.stringify(companies));
};
